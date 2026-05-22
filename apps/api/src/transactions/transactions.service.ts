import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TransactionsRepository } from './transactions.repository';
import { AccountsService } from '../accounts/accounts.service';
import { AccountsRepository } from '../accounts/accounts.repository';
import { NewTransaction } from '@mock-bank/database';

@Injectable()
export class TransactionsService {
  constructor(
    private transactionsRepository: TransactionsRepository,
    private accountsRepository: AccountsRepository,
    private accountsService: AccountsService,
  ) {}

  async recordTransaction(userId: number, data: Omit<NewTransaction, 'accountId' | 'status'> & { accountId: number }) {
    // Verify account ownership
    await this.accountsService.findOne(data.accountId, userId);

    const transaction = await this.transactionsRepository.create({
      ...data,
      status: 'completed',
    });

    // Update account balance
    const amount = data.type === 'withdrawal' ? `-${data.amount}` : data.amount;
    await this.accountsService.updateBalance(data.accountId, userId, amount);

    return transaction;
  }

  // Internal method for webhook/system use (no userId required)
  async recordSystemTransaction(data: Omit<NewTransaction, 'status'>) {
    const transaction = await this.transactionsRepository.create({
      ...data,
      status: 'completed',
    });

    // Update account balance directly via repository
    const account = await this.accountsRepository.findById(data.accountId);
    if (account) {
      const currentBalance = parseFloat(account.balance);
      const changeAmount = parseFloat(data.amount);
      const newBalance = data.type === 'withdrawal'
        ? (currentBalance - changeAmount).toFixed(2)
        : (currentBalance + changeAmount).toFixed(2);
      await this.accountsRepository.updateBalance(data.accountId, newBalance);
    }

    return transaction;
  }

  async findByAccountId(accountId: number, userId: number) {
    // Verify account ownership
    await this.accountsService.findOne(accountId, userId);

    return this.transactionsRepository.findByAccountId(accountId);
  }

  async findOne(id: number, userId: number) {
    const transaction = await this.transactionsRepository.findById(id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Verify account ownership
    await this.accountsService.findOne(transaction.accountId, userId);

    return transaction;
  }

  async createPendingTransaction(userId: number, data: Omit<NewTransaction, 'accountId' | 'status'> & { accountId: number }) {
    // Verify account ownership
    await this.accountsService.findOne(data.accountId, userId);

    return this.transactionsRepository.create({
      ...data,
      status: 'pending',
    });
  }

  async completeTransaction(id: number, userId: number) {
    const transaction = await this.transactionsRepository.findById(id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not pending');
    }

    // Verify account ownership
    await this.accountsService.findOne(transaction.accountId, userId);

    // Update transaction status
    await this.transactionsRepository.updateStatus(id, 'completed');

    // Update account balance
    const amount = transaction.type === 'withdrawal' ? `-${transaction.amount}` : transaction.amount;
    await this.accountsService.updateBalance(transaction.accountId, userId, amount);

    return this.transactionsRepository.findById(id);
  }
}
