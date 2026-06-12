// Mock for @mock-bank/database to prevent postgres connection during tests
export const db = {} as any;
export * from '../../../../packages/database/src/schema';
export * from '../../../../packages/database/src/types';
