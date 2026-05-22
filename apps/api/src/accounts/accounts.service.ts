import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccountsRepository } from './accounts.repository';
import { NewAccount } from '@mock-bank/database';

@Injectable()
export class AccountsService {
  constructor(private accountsRepository: AccountsRepository) {}

  async create(userId: number, data: Omit<NewAccount, 'userId'>) {
    return this.accountsRepository.create({
      ...data,
      userId,
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

  async updateBalance(id: number, userId: number, amount: string) {
    const account = await this.findOne(id, userId);
    const currentBalance = parseFloat(account.balance);
    const changeAmount = parseFloat(amount);
    const newBalance = (currentBalance + changeAmount).toFixed(2);

    return this.accountsRepository.updateBalance(id, newBalance);
  }
}
