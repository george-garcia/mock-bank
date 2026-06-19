import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CustomersRepository } from './customers.repository';
import { AccountsService } from '../accounts/accounts.service';
import { AuditService } from '../audit/audit.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private repo: CustomersRepository,
    private accountsService: AccountsService,
    private auditService: AuditService,
  ) {}

  async list() {
    const rows = await this.repo.findAll();
    return rows.map((u) => this.publicView(u));
  }

  /** Customer profile + their accounts (with balances). */
  async getDetail(id: number) {
    const u = await this.repo.findById(id);
    if (!u) throw new NotFoundException('Customer not found');
    const accounts = await this.accountsService.findByUser(id);
    return { ...this.publicView(u), accounts };
  }

  async update(staffId: number, id: number, data: UpdateCustomerDto) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Customer not found');
    if (data.email && data.email !== existing.email) {
      const dup = await this.repo.findByEmail(data.email);
      if (dup && dup.id !== id) throw new ConflictException('Email already in use');
    }
    const updated = await this.repo.update(id, data);
    await this.auditService.record({
      actorType: 'staff',
      actorUserId: staffId,
      action: 'admin.customer_updated',
      targetType: 'user',
      targetId: id,
      metadata: { fields: Object.keys(data) },
    });
    return this.publicView(updated!);
  }

  // Never expose passwordHash / totpSecret to the admin app.
  private publicView(u: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    twoFactorMethod: string;
    createdAt: Date;
  }) {
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      twoFactorMethod: u.twoFactorMethod,
      createdAt: u.createdAt,
    };
  }
}
