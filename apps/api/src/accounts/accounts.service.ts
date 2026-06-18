import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccountsRepository } from './accounts.repository';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class AccountsService {
  constructor(
    private accountsRepository: AccountsRepository,
    private ledgerService: LedgerService,
  ) {}

  async create(userId: number, data: { type: 'checking' | 'savings' }) {
    const account = await this.accountsRepository.create({ userId, type: data.type, status: 'active' });
    // Every customer account is backed by a liability ledger account (its balance lives there).
    await this.ledgerService.openCustomerAccount(account.id, data.type);
    return this.withBalance(account, '0.00');
  }

  async findAllByUser(userId: number) {
    const accts = await this.accountsRepository.findByUserId(userId);
    const balances = await this.ledgerService.getBalances(accts.map((a) => a.id));
    return accts.map((a) => this.withBalance(a, balances.get(a.id) ?? '0.00'));
  }

  async findOne(id: number, userId: number) {
    const account = await this.accountsRepository.findById(id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.withBalance(account, await this.ledgerService.getBalance(id));
  }

  /** Fetch an account without an ownership check — for internal/system callers (webhooks). */
  async findByIdInternal(id: number) {
    const account = await this.accountsRepository.findById(id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return this.withBalance(account, await this.ledgerService.getBalance(id));
  }

  private withBalance<T extends object>(account: T, balance: string) {
    return { ...account, balance };
  }
}
