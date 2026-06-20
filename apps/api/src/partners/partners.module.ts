import { Module } from '@nestjs/common';
import { PartnersRepository } from './partners.repository';
import { PartnerApiKeyGuard } from './partner-api-key.guard';

/**
 * Partner identity + API-key auth, shared by the public partner-facing products
 * (the card Network API and the Connect API). Exports the guard so those modules
 * can apply it via @UseGuards(PartnerApiKeyGuard).
 */
@Module({
  providers: [PartnersRepository, PartnerApiKeyGuard],
  exports: [PartnersRepository, PartnerApiKeyGuard],
})
export class PartnersModule {}
