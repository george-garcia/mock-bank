import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CardsService } from '../cards/cards.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { toDecimalString, toMinor } from '../common/money';
import { AuthenticatedPartner } from '../partners/partner-api-key.guard';
import { CreateAuthorizationDto, CaptureAuthorizationDto, CreateRefundDto } from './dto/network.dto';

/**
 * The bank's card-acceptance ("Network") product: a merchant authorizes and captures a charge
 * against a bank-issued card by PAN, just like an acquirer/network. It reuses the exact ledger
 * machinery the internal Lithic webhook uses — an authorization places a hold (reserving the
 * cardholder's available funds) and a capture settles it (debits the cardholder, credits the
 * card-network GL). The merchant never touches the bank's database directly.
 */
@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);

  constructor(
    private cardsService: CardsService,
    private ledgerService: LedgerService,
    private auditService: AuditService,
  ) {}

  async authorize(partner: AuthenticatedPartner, dto: CreateAuthorizationDto) {
    const pan = dto.card.number.replace(/\s+/g, '');
    const last4 = pan.slice(-4);
    const amount = toDecimalString(dto.amount); // cents → "xx.xx"
    const token = `net_${randomBytes(8).toString('hex')}`;

    const baseTx = {
      lithicTransactionToken: token,
      merchantName: dto.merchant.name,
      merchantMcc: dto.merchant.mcc,
      merchantCity: dto.merchant.city,
      amount,
      metadata: JSON.stringify({ partnerId: partner.id, currency: dto.currency ?? 'USD' }),
    };

    const decline = async (reason: string, cardId?: number) => {
      if (cardId) {
        await this.cardsService.recordCardTransaction(cardId, { ...baseTx, status: 'declined', declinedReason: reason });
      }
      this.logger.warn(`Declined authorization (${reason}) for •••• ${last4}`);
      return { id: token, approved: false, declineReason: reason, last4 };
    };

    const card = await this.cardsService.findByPanInternal(pan);
    if (!card) return decline('card_not_found');
    if (card.status !== 'active') return decline('card_not_active', card.id);
    if (card.expiryMonth !== dto.card.expMonth.padStart(2, '0') || card.expiryYear !== dto.card.expYear) {
      return decline('invalid_expiry', card.id);
    }
    if (card.cvv && card.cvv !== dto.card.cvv) return decline('invalid_cvv', card.id);

    // Reserve the funds with an authorization hold (idempotent on the auth token).
    try {
      await this.ledgerService.placeHold(card.accountId, {
        amount,
        externalRef: `card_auth:${token}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: { cardId: card.id, merchant: dto.merchant.name, partnerId: partner.id },
      });
    } catch {
      return decline('insufficient_funds', card.id);
    }

    const authCode = String(100000 + Math.floor(Math.random() * 900000));
    await this.cardsService.recordCardTransaction(card.id, { ...baseTx, status: 'authorized', authCode });
    await this.auditService.record({
      action: 'network.authorization',
      targetType: 'card',
      targetId: card.id,
      amountMinor: dto.amount,
      metadata: { token, partnerId: partner.id, merchant: dto.merchant.name },
    });
    this.logger.log(`Approved ${amount} on •••• ${last4} for ${dto.merchant.name}`);
    return { id: token, approved: true, last4, authCode, network: 'mockbank', amount, currency: dto.currency ?? 'USD' };
  }

  async capture(partner: AuthenticatedPartner, token: string, dto: CaptureAuthorizationDto) {
    const { cardTx, card } = await this.requireAuthorized(token);
    const amount = dto.amount !== undefined ? toDecimalString(dto.amount) : cardTx.amount;

    // Release the hold and post the settlement (forced post; idempotent on the settlement key).
    await this.ledgerService.captureHold(`card_auth:${token}`);
    const result = await this.ledgerService.cardSettlement(card.accountId, {
      amount,
      description: `Card purchase: ${cardTx.merchantName}`,
      idempotencyKey: `network_settlement:${token}`,
    });
    await this.cardsService.settleCardTransaction(cardTx.id, result.transaction.id);
    await this.auditService.record({
      action: 'network.capture',
      targetType: 'account',
      targetId: card.accountId,
      amountMinor: toMinor(amount),
      metadata: { token, partnerId: partner.id, transactionId: result.transaction.id },
    });
    this.logger.log(`Captured ${amount} (${token})`);
    return { id: token, captured: true, amount, settlementId: result.transaction.id };
  }

  async void(partner: AuthenticatedPartner, token: string) {
    const { cardTx } = await this.requireAuthorized(token);
    await this.ledgerService.releaseHold(`card_auth:${token}`);
    await this.cardsService.voidCardTransaction(cardTx.id);
    await this.auditService.record({ action: 'network.void', targetType: 'card_transaction', targetId: token, metadata: { partnerId: partner.id } });
    this.logger.log(`Voided authorization ${token}`);
    return { id: token, voided: true };
  }

  async refund(partner: AuthenticatedPartner, dto: CreateRefundDto) {
    const cardTx = await this.cardsService.findCardTransactionByLithicToken(dto.authorizationToken);
    if (!cardTx) throw new NotFoundException('Authorization not found');
    const card = await this.cardsService.findCardByIdInternal(cardTx.cardId);
    if (!card) throw new NotFoundException('Card not found');

    const amount = toDecimalString(dto.amount);
    const result = await this.ledgerService.refund(card.accountId, {
      amount,
      description: `Refund: ${cardTx.merchantName}`,
      idempotencyKey: `network_refund:${dto.authorizationToken}:${dto.amount}`,
    });
    await this.auditService.record({
      action: 'network.refund',
      targetType: 'account',
      targetId: card.accountId,
      amountMinor: dto.amount,
      metadata: { authorizationToken: dto.authorizationToken, partnerId: partner.id, transactionId: result.transaction.id },
    });
    this.logger.log(`Refunded ${amount} for ${dto.authorizationToken}`);
    return { refunded: true, amount, transactionId: result.transaction.id };
  }

  /** Load an authorization by token, asserting it is still in the 'authorized' state. */
  private async requireAuthorized(token: string) {
    const cardTx = await this.cardsService.findCardTransactionByLithicToken(token);
    if (!cardTx) throw new NotFoundException('Authorization not found');
    if (cardTx.status !== 'authorized') {
      throw new BadRequestException(`Authorization is already ${cardTx.status}`);
    }
    const card = await this.cardsService.findCardByIdInternal(cardTx.cardId);
    if (!card) throw new NotFoundException('Card not found');
    return { cardTx, card };
  }
}
