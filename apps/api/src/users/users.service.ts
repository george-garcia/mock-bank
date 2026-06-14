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

  /** The current user's profile with sensitive fields stripped. */
  async getProfile(id: number) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      return null;
    }
    // Never expose credentials or 2FA secrets to the client.
    const { passwordHash, totpSecret, ...profile } = user;
    return profile;
  }

  async update(id: number, data: Partial<NewUser>) {
    return this.usersRepository.update(id, data);
  }

  /** Update a user's active 2FA method (and TOTP secret when applicable). */
  async setTwoFactor(
    id: number,
    data: { method: 'none' | 'email' | 'totp'; totpSecret?: string | null },
  ) {
    return this.usersRepository.update(id, {
      twoFactorMethod: data.method,
      totpSecret: data.totpSecret === undefined ? undefined : data.totpSecret,
    });
  }
}
