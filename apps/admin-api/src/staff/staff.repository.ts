import { Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { db, staffUsers, NewStaffUser, StaffUser } from '@mock-bank/database';

@Injectable()
export class StaffRepository {
  async create(data: NewStaffUser): Promise<StaffUser> {
    const [s] = await db.insert(staffUsers).values(data).returning();
    return s;
  }

  async findByEmail(email: string): Promise<StaffUser | null> {
    const [s] = await db.select().from(staffUsers).where(eq(staffUsers.email, email));
    return s || null;
  }

  async findById(id: number): Promise<StaffUser | null> {
    const [s] = await db.select().from(staffUsers).where(eq(staffUsers.id, id));
    return s || null;
  }

  async findAll() {
    return db.select().from(staffUsers).orderBy(desc(staffUsers.createdAt));
  }

  async update(id: number, data: Partial<NewStaffUser>) {
    const [s] = await db.update(staffUsers).set({ ...data, updatedAt: new Date() }).where(eq(staffUsers.id, id)).returning();
    return s || null;
  }
}
