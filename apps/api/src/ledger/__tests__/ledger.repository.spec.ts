import { BadRequestException } from '@nestjs/common';
import { LedgerRepository, PostInput } from '../ledger.repository';

/**
 * post() validates the journal before opening a DB transaction, so these invariant checks
 * run without a database. Atomicity/locking/idempotency are exercised by the live smoke and
 * integration tests against Postgres.
 */
describe('LedgerRepository (journal invariants)', () => {
  const repo = new LedgerRepository();

  const base = (entries: PostInput['entries']): PostInput => ({
    idempotencyKey: 'k1',
    type: 'transfer',
    entries,
  });

  it('rejects an unbalanced journal (debits ≠ credits)', async () => {
    await expect(
      repo.post(base([
        { ledgerAccountId: 1, direction: 'debit', amountMinor: 100 },
        { ledgerAccountId: 2, direction: 'credit', amountMinor: 90 },
      ])),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects non-positive or non-integer amounts', async () => {
    await expect(
      repo.post(base([
        { ledgerAccountId: 1, direction: 'debit', amountMinor: 0 },
        { ledgerAccountId: 2, direction: 'credit', amountMinor: 0 },
      ])),
    ).rejects.toThrow(BadRequestException);

    await expect(
      repo.post(base([
        { ledgerAccountId: 1, direction: 'debit', amountMinor: 10.5 },
        { ledgerAccountId: 2, direction: 'credit', amountMinor: 10.5 },
      ])),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a journal with fewer than two entries', async () => {
    await expect(
      repo.post(base([{ ledgerAccountId: 1, direction: 'debit', amountMinor: 100 }])),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a missing idempotency key', async () => {
    await expect(
      repo.post({
        idempotencyKey: '',
        type: 'transfer',
        entries: [
          { ledgerAccountId: 1, direction: 'debit', amountMinor: 100 },
          { ledgerAccountId: 2, direction: 'credit', amountMinor: 100 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
