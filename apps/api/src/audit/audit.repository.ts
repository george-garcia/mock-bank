import { Injectable } from '@nestjs/common';
import { db, auditLogs, NewAuditLog } from '@mock-bank/database';

@Injectable()
export class AuditRepository {
  async create(data: NewAuditLog) {
    await db.insert(auditLogs).values(data);
  }
}
