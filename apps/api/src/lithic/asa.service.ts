import { Injectable, Logger } from '@nestjs/common';
import { Card } from '@mock-bank/database';
import { LedgerService } from '../ledger/ledger.service';
import { toDecimalString } from '../common/money';
import { CardEventResult } from './lithic.types';

export interface AsaDecision {
  approved: boolean;
  result: CardEventResult; // APPROVED, or a Lithic decline result
}

/**
 * Auth Stream Access (ASA) — the program's real-time authorization decision. Lithic does not know
 * the bank's ledger balance, so for each AUTHORIZATION the processor calls the program here. The
 * program checks the card state and the cardholder's *available* balance, places an authorization
 * hold if approved, and returns the Lithic result. This is the real-bank decisioning path.
 */
@Injectable()
export class AsaService {
  private readonly logger = new Logger(AsaService.name);

  constructor(private ledger: LedgerService) {}

  async decide(card: Card, amountMinor: number, transactionToken: string): Promise<AsaDecision> {
    if (card.state === 'PAUSED') return { approved: false, result: 'CARD_PAUSED' };
    if (card.state === 'CLOSED') return { approved: false, result: 'CARD_CLOSED' };
    if (card.state !== 'OPEN') return { approved: false, result: 'CARD_NOT_ACTIVATED' };

    // Reserve the funds with an authorization hold (idempotent on the transaction token).
    try {
      await this.ledger.placeHold(card.accountId, {
        amount: toDecimalString(amountMinor),
        externalRef: `auth:${transactionToken}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: { cardId: card.id, transactionToken },
      });
    } catch {
      this.logger.warn(`ASA decline: insufficient available funds for card ${card.id}`);
      return { approved: false, result: 'INSUFFICIENT_FUNDS' };
    }
    return { approved: true, result: 'APPROVED' };
  }
}
