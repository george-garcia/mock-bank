import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { NewUser } from '@mock-bank/database';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async create(data: NewUser) {
    return this.usersRepository.create(data);
  }

  async findById(id: number) {
    return this.usersRepository.findById(id);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }
}
