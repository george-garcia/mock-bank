import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountsRepository } from './accounts.repository';
import { AuditService } from '../audit/audit.service';
import { toDecimalString } from '../common/money';

@Injectable()
export class AccountsService {
  constructor(
    private repo: AccountsRepository,
    private auditService: AuditService,
  ) {}

  async listAll() {
    const rows = await this.repo.findAllWithOwner();
    const balances = await this.repo.balancesFor(rows.map((r) => r.id));
    return rows.map((r) => ({ ...r, balance: toDecimalString(balances.get(r.id) ?? 0) }));
  }

  async findByUser(userId: number) {
    const rows = await this.repo.findByUserId(userId);
    const balances = await this.repo.balancesFor(rows.map((r) => r.id));
    return rows.map((r) => ({ ...r, balance: toDecimalString(balances.get(r.id) ?? 0) }));
  }

  async getById(id: number) {
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundException('Account not found');
    const balances = await this.repo.balancesFor([id]);
    return { ...a, balance: toDecimalString(balances.get(id) ?? 0) };
  }

  /** Account lifecycle action (freeze / unfreeze / close). The bank API enforces the status
   *  at posting time; here we only flip the flag and record who did it. */
  async setStatus(staffId: number, id: number, status: 'active' | 'frozen' | 'closed', action: string) {
    const a = await this.repo.updateStatus(id, status);
    if (!a) throw new NotFoundException('Account not found');
    await this.auditService.record({
      actorType: 'staff',
      actorUserId: staffId,
      action,
      targetType: 'account',
      targetId: id,
      metadata: { status },
    });
    const balances = await this.repo.balancesFor([id]);
    return { ...a, balance: toDecimalString(balances.get(id) ?? 0) };
  }
}
