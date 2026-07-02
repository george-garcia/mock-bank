import { Injectable, Logger } from '@nestjs/common';
import { LithicService } from '../lithic/lithic.service';
import { AuditService } from '../audit/audit.service';
import { toDecimalString } from '../common/money';
import { AuthenticatedPartner } from '../partners/partner-api-key.guard';
import { CreateAuthorizationDto, CaptureAuthorizationDto, CreateRefundDto } from './dto/network.dto';

/**
 * The simulated acquirer / card network sitting upstream of the issuer (Lithic). A merchant submits
 * a card charge here; we translate it into Lithic network messages (AUTHORIZATION → CLEARING /
 * REVERSAL, CREDIT_AUTHORIZATION → RETURN). The issuer (LithicService) runs the lifecycle and the
 * program's ASA decides each auth. This service never touches the ledger directly — Lithic does,
 * via the program's webhook. The partner-facing request/response shapes are unchanged.
 */
@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);

  constructor(
    private lithic: LithicService,
    private auditService: AuditService,
  ) {}

  async authorize(partner: AuthenticatedPartner, dto: CreateAuthorizationDto) {
    const pan = dto.card.number.replace(/\s+/g, '');
    const last4 = pan.slice(-4);

    const { transaction, declineReason } = await this.lithic.authorizeTransaction({
      pan,
      expMonth: dto.card.expMonth,
      expYear: dto.card.expYear,
      cvv: dto.card.cvv,
      amount: dto.amount, // minor units
      partnerId: partner.id,
      merchant: { descriptor: dto.merchant.name, mcc: dto.merchant.mcc, city: dto.merchant.city },
    });

    if (!transaction || transaction.result !== 'APPROVED') {
      this.logger.warn(`Declined authorization (${declineReason}) for •••• ${last4}`);
      return { id: transaction?.token ?? null, approved: false, declineReason: declineReason ?? 'declined', last4 };
    }

    await this.auditService.record({
      action: 'network.authorization',
      targetType: 'card_transaction',
      targetId: transaction.token,
      amountMinor: dto.amount,
      metadata: { partnerId: partner.id, merchant: dto.merchant.name },
    });
    this.logger.log(`Approved ${transaction.amount} on •••• ${last4} for ${dto.merchant.name}`);
    return {
      id: transaction.token,
      approved: true,
      last4,
      authCode: transaction.authorization_code,
      network: transaction.network,
      amount: toDecimalString(transaction.amount),
      currency: dto.currency ?? 'USD',
    };
  }

  async capture(partner: AuthenticatedPartner, token: string, dto: CaptureAuthorizationDto) {
    const tx = await this.lithic.clearTransaction(token, dto.amount);
    await this.auditService.record({
      action: 'network.capture',
      targetType: 'card_transaction',
      targetId: token,
      amountMinor: tx.settled_amount,
      metadata: { partnerId: partner.id },
    });
    return { id: token, captured: true, amount: toDecimalString(tx.settled_amount) };
  }

  async void(partner: AuthenticatedPartner, token: string) {
    await this.lithic.reverseAuthorization(token);
    await this.auditService.record({ action: 'network.void', targetType: 'card_transaction', targetId: token, metadata: { partnerId: partner.id } });
    return { id: token, voided: true };
  }

  async refund(partner: AuthenticatedPartner, dto: CreateRefundDto) {
    const tx = await this.lithic.creditTransaction(partner.id, dto.authorizationToken, dto.amount);
    await this.auditService.record({
      action: 'network.refund',
      targetType: 'card_transaction',
      targetId: tx.token,
      amountMinor: dto.amount,
      metadata: { authorizationToken: dto.authorizationToken, partnerId: partner.id },
    });
    return { refunded: true, amount: toDecimalString(tx.amount), transactionId: tx.token };
  }
}
