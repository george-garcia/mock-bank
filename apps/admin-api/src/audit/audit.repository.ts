import { Injectable } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import { db, auditLogs, NewAuditLog } from '@mock-bank/database';

@Injectable()
export class AuditRepository {
  async create(data: NewAuditLog) {
    await db.insert(auditLogs).values(data);
  }

  async findRecent(limit: number, offset: number) {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(limit).offset(offset);
  }
}
