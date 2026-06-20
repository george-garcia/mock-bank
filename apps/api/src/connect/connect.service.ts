import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { ConnectGrant } from '@mock-bank/database';
import { AccountsService } from '../accounts/accounts.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { toDecimalString } from '../common/money';
import { ConnectRepository } from './connect.repository';
import { AuthenticatedPartner } from '../partners/partner-api-key.guard';
import { CreateConnectTransferDto } from './dto/connect.dto';

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
    private ledgerService: LedgerService,
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

  async createTransfer(grant: ConnectGrant, dto: CreateConnectTransferDto) {
    const amount = toDecimalString(dto.amount);
    const idempotencyKey = `connect_transfer:${grant.id}:${dto.idempotencyKey ?? randomBytes(8).toString('hex')}`;

    const existing = await this.repo.findTransferByIdempotencyKey(idempotencyKey);
    if (existing) return this.transferView(existing);

    // debit pulls funds out to the partner; credit (cash-out) pushes funds back in.
    const move = dto.direction === 'debit'
      ? this.ledgerService.achDebit(grant.accountId, { amount, description: dto.description ?? 'Connect debit', idempotencyKey })
      : this.ledgerService.achCredit(grant.accountId, { amount, description: dto.description ?? 'Connect credit (cash-out)', idempotencyKey });
    const ledgerResult = await move;

    const transfer = await this.repo.createTransfer({
      grantId: grant.id,
      direction: dto.direction,
      amountMinor: dto.amount,
      status: 'posted',
      description: dto.description,
      ledgerTransactionId: ledgerResult.transaction.id,
      idempotencyKey,
    });
    await this.auditService.record({
      actorType: 'customer',
      actorUserId: grant.userId,
      action: `connect.transfer.${dto.direction}`,
      targetType: 'account',
      targetId: grant.accountId,
      amountMinor: dto.amount,
      metadata: { partnerId: grant.partnerId, transferId: transfer.id, transactionId: ledgerResult.transaction.id },
    });
    this.logger.log(`Connect ${dto.direction} ${amount} on account ${grant.accountId} (partner ${grant.partnerId})`);
    return this.transferView(transfer);
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

  private transferView(t: { id: number; direction: string; amountMinor: number; status: string; createdAt: Date }) {
    return { id: t.id, direction: t.direction, amount: toDecimalString(t.amountMinor), status: t.status, created_at: t.createdAt };
  }
}
