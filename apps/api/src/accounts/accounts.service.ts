import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccountsRepository } from './accounts.repository';

@Injectable()
export class AccountsService {
  constructor(private accountsRepository: AccountsRepository) {}

  async create(userId: number, data: { type: 'checking' | 'savings' }) {
    return this.accountsRepository.create({
      userId,
      type: data.type,
      balance: '0.00',
      status: 'active',
    });
  }

  async findAllByUser(userId: number) {
    return this.accountsRepository.findByUserId(userId);
  }

  async findOne(id: number, userId: number) {
    const account = await this.accountsRepository.findById(id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return account;
  }

  /** Fetch an account without an ownership check — for internal/system callers (webhooks, settlements). */
  async findByIdInternal(id: number) {
    const account = await this.accountsRepository.findById(id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  /** Ownership-checked balance change (user-initiated). */
  async updateBalance(id: number, userId: number, amount: string) {
    await this.findOne(id, userId);
    return this.adjustBalance(id, amount);
  }

  /** System-context balance change; `amount` may be negative. Single home for balance arithmetic. */
  async adjustBalance(id: number, amount: string) {
    const account = await this.findByIdInternal(id);
    const newBalance = (parseFloat(account.balance) + parseFloat(amount)).toFixed(2);
    return this.accountsRepository.updateBalance(id, newBalance);
  }
}
