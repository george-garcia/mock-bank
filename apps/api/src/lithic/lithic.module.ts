import { Module } from '@nestjs/common';
import { LithicService } from './lithic.service';
import { LithicRepository } from './lithic.repository';
import { AsaService } from './asa.service';
import { LithicWebhookService } from './lithic-webhook.service';
import { LithicWebhookGuard } from './lithic-webhook.guard';
import { LedgerModule } from '../ledger/ledger.module';
import { AuditModule } from '../audit/audit.module';

/**
 * The Lithic processor: card issuing, the card transaction lifecycle (driven by ASA), ACH Payments,
 * and the program's webhook consumer. Self-contained (no dependency on CardsModule), so CardsModule
 * can import this without a cycle.
 */
@Module({
  imports: [LedgerModule, AuditModule],
  providers: [LithicService, LithicRepository, AsaService, LithicWebhookService, LithicWebhookGuard],
  exports: [LithicService, LithicRepository, LithicWebhookService, LithicWebhookGuard],
})
export class LithicModule {}
