import { Module } from '@nestjs/common';
import { CustomersRepository } from './customers.repository';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { AccountsModule } from '../accounts/accounts.module';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [AccountsModule],
  providers: [CustomersRepository, CustomersService, RolesGuard],
  controllers: [CustomersController],
})
export class CustomersModule {}
