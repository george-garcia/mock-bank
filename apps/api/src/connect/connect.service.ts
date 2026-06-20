import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { ConnectGrant } from '@mock-bank/database';
import { AccountsService } from '../accounts/accounts.service';
import { LithicService } from '../lithic/lithic.service';
import { AuditService } from '../audit/audit.service';
import { toDecimalString } from '../common/money';
import { ConnectRepository } from './connect.repository';
import { AuthenticatedPartner } from '../partners/partner-api-key.guard';
import { CreateConnectTransferDto } from './dto/connect.dto';
import { LithicPayment } from '../lithic/lithic.types';

const SESSION_TTL_MS = 30 * 60 * 1000; // a link session is valid for 30 minutes

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const randomToken = (prefix: string) => `${prefix}-${randomBytes(24).toString('hex')}`;

/**
 * The bank's account-linking ("Connect") product — a Plaid-style flow:
 *   1. partner creates a link session (server-to-server)               → link_token
 *   2. customer authorizes it on the bank's hosted page (this consent)  → public_token
 *   3. partner exchanges the public token (server-to-server)            → access_token (a grant)
 *   4. partner uses the grant to read balances and move money (ACH).
 * The partner only ever sees opaque tokens; it never touches the bank's database.
 */
@Injectable()
export class ConnectService {
  private readonly logger = new Logger(ConnectService.name);

  constructor(
    private repo: ConnectRepository,
    private accountsService: AccountsService,
    private lithic: LithicService,
    private auditService: AuditService,
    private config: ConfigService,
  ) {}

  private hostedBaseUrl() {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  // ── Step 1: partner creates a link session ────────────────────────────────
  async createLinkSession(partner: AuthenticatedPartner, scopes = 'balances,transfers') {
    const linkToken = randomToken('link');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.repo.createLinkSession({ partnerId: partner.id, linkToken, scopes, status: 'created', expiresAt });
    return {
      link_token: linkToken,
      hosted_url: `${this.hostedBaseUrl()}/connect?link_token=${linkToken}`,
      expires_at: expiresAt.toISOString(),
    };
  }

  // ── Step 2a: the hosted page loads public, non-secret session info ─────────
  async getPublicSession(linkToken: string) {
    const session = this.assertLiveSession(await this.repo.findLinkSessionByLinkToken(linkToken));
    const partnerName = await this.repo.findPartnerName(session.partnerId);
    return {
      partner_name: partnerName ?? 'Unknown partner',
      scopes: session.scopes.split(','),
      status: session.status,
    };
  }

  // ── Step 2b: the customer consents (authenticated as a bank customer) ──────
  async authorizeSession(linkToken: string, userId: number, accountId: number) {
    const session = this.assertLiveSession(await this.repo.findLinkSessionByLinkToken(linkToken));
    if (session.status !== 'created') throw new BadRequestException('Link session already used');

    // Ownership check — findOne throws if the account is not the logged-in customer's.
    await this.accountsService.findOne(accountId, userId);

    const publicToken = randomToken('public');
    await this.repo.updateLinkSession(session.id, { status: 'authorized', userId, accountId, publicToken });
    await this.auditService.record({
      actorType: 'customer',
      actorUserId: userId,
      action: 'connect.authorized',
      targetType: 'account',
      targetId: accountId,
      metadata: { partnerId: session.partnerId },
    });
    this.logger.log(`Customer ${userId} linked account ${accountId} to partner ${session.partnerId}`);
    return { public_token: publicToken };
  }

  // ── Step 3: partner exchanges the public token for a durable grant ─────────
  async exchangeToken(partner: AuthenticatedPartner, publicToken: string) {
    const session = await this.repo.findLinkSessionByPublicToken(publicToken);
    if (!session || session.partnerId !== partner.id) throw new BadRequestException('Invalid public token');
    if (session.status !== 'authorized') throw new BadRequestException('Public token already exchanged');
    if (!session.userId || !session.accountId) throw new BadRequestException('Link session was not authorized');

    const accessToken = randomToken('access');
    const grant = await this.repo.createGrant({
      partnerId: partner.id,
      userId: session.userId,
      accountId: session.accountId,
      accessTokenHash: sha256(accessToken),
      externalBankAccountToken: `ext_${randomBytes(16).toString('hex')}`, // Lithic External Bank Account
      scopes: session.scopes,
    });
    await this.repo.updateLinkSession(session.id, { status: 'exchanged' });
    await this.auditService.record({
      actorType: 'customer',
      actorUserId: session.userId,
      action: 'connect.grant_created',
      targetType: 'account',
      targetId: session.accountId,
      metadata: { partnerId: partner.id, grantId: grant.id },
    });

    const account = await this.accountsService.findByIdInternal(session.accountId);
    return { access_token: accessToken, accounts: [this.accountView(account)] };
  }

  // ── Step 4: partner reads balances / moves money via the grant ─────────────
  async getAccounts(grant: ConnectGrant) {
    const account = await this.accountsService.findByIdInternal(grant.accountId);
    return { accounts: [this.accountView(account)] };
  }

  /** Move money on the linked account as a Lithic ACH Payment (DEBIT = pull, CREDIT = cash-out). */
  async createTransfer(grant: ConnectGrant, dto: CreateConnectTransferDto) {
    const idempotencyKey = `connect_transfer:${grant.id}:${dto.idempotencyKey ?? randomBytes(8).toString('hex')}`;

    const payment = await this.lithic.createPayment({
      direction: dto.direction === 'debit' ? 'DEBIT' : 'CREDIT',
      amount: dto.amount, // minor units
      financialAccountToken: `account_${grant.accountId}`,
      externalBankAccountToken: grant.externalBankAccountToken ?? `ext_${grant.id}`,
      idempotencyKey,
      grantId: grant.id,
    });

    await this.auditService.record({
      actorType: 'customer',
      actorUserId: grant.userId,
      action: `connect.transfer.${dto.direction}`,
      targetType: 'account',
      targetId: grant.accountId,
      amountMinor: dto.amount,
      metadata: { partnerId: grant.partnerId, paymentToken: payment.token },
    });
    this.logger.log(`Connect ${dto.direction} ${toDecimalString(dto.amount)} on account ${grant.accountId} (partner ${grant.partnerId})`);
    return this.transferView(payment, dto.direction);
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  private assertLiveSession<T extends { expiresAt: Date } | null>(session: T): NonNullable<T> {
    if (!session) throw new NotFoundException('Unknown link session');
    if (session.expiresAt.getTime() < Date.now()) throw new BadRequestException('Link session expired');
    return session as NonNullable<T>;
  }

  private accountView(account: { id: number; type: string; balance: string; availableBalance: string }) {
    return {
      id: account.id,
      type: account.type,
      mask: `••••${String(account.id).padStart(4, '0')}`,
      balance: account.balance,
      available: account.availableBalance,
    };
  }

  private transferView(payment: LithicPayment, direction: 'debit' | 'credit') {
    return {
      id: payment.token,
      direction,
      amount: toDecimalString(payment.amount),
      status: payment.status.toLowerCase(),
      created_at: payment.created,
    };
  }
}
