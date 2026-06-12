# Mock Bank Project Plan

## Overview
A complete mock bank using real card issuing technology (Lithic sandbox) with fake money. Built with NestJS API, Vite React frontend, Tailwind, Drizzle ORM, PostgreSQL.

## Architecture
- **API**: NestJS with service/repository pattern
- **Frontend**: Vite + React + Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **Card Issuer**: Lithic (sandbox API)
- **Monorepo**: pnpm workspaces

---

## Phase 1: Project Scaffolding ✅
**Status**: COMPLETED

### Tasks
- [x] Initialize monorepo with pnpm workspaces
- [x] Set up NestJS API app (`apps/api`)
- [x] Set up Vite React app (`apps/web`)
- [x] Set up shared packages (`packages/database`, `packages/types`)
- [x] Configure TypeScript, ESLint, Prettier across workspace
- [x] Add Docker Compose for PostgreSQL
- [x] Add environment configuration (`.env.example`)
- [x] Add README with setup instructions

### Deliverables
- Running `pnpm dev` starts both API and web
- Database connects via Docker Compose
- Hot reload works in both apps

---

## Phase 2: Database Schema & Drizzle ORM
**Status**: COMPLETED ✅

### Tasks
- [ ] Define database schema:
  - `users` table (id, email, firstName, lastName, createdAt, updatedAt)
  - `accounts` table (id, userId, type: checking|savings, balance, status, createdAt)
  - `transactions` table (id, accountId, type: deposit|withdrawal|card_auth|card_settlement|transfer, amount, description, status, metadata, createdAt)
  - `cards` table (id, accountId, lithicCardToken, lastFour, status: active|frozen|cancelled, createdAt)
  - `card_transactions` table (id, cardId, transactionId, lithicTransactionToken, merchantName, merchantMcc, amount, status, createdAt)
- [ ] Set up Drizzle ORM with connection pooling
- [ ] Create migration setup (`drizzle-kit`)
- [ ] Add seed script with test users/accounts
- [ ] Add database package exports (schema, types, connection)

### Deliverables
- `pnpm db:migrate` runs migrations
- `pnpm db:seed` creates test data
- `pnpm db:studio` opens Drizzle Studio
- Type-safe schema exports for API to consume

---

## Phase 3: Core Banking API (Users & Accounts)
**Status**: COMPLETED ✅

### Tasks
- [ ] User module: register, login (simple JWT), get profile
- [ ] Account module: create account, get accounts, get account by id
- [ ] Account balance service: update balance atomically
- [ ] Transaction module: record transactions, get transaction history
- [ ] Implement repository pattern with Drizzle
- [ ] Add validation pipes (Zod)
- [ ] Add error handling and standardized API responses
- [ ] Add Swagger/OpenAPI documentation

### Deliverables
- POST /auth/register - Create user
- POST /auth/login - Get JWT
- GET /accounts - List user accounts
- POST /accounts - Create new account
- GET /accounts/:id/transactions - Get transaction history
- Swagger UI at /api/docs

---

## Phase 4: Lithic Card Issuer Integration
**Status**: COMPLETED ✅

### Tasks
- [ ] Sign up for Lithic developer account & get Sandbox API key
- [ ] Create Lithic adapter/module in NestJS
- [ ] Implement card lifecycle:
  - Create virtual card (POST /v1/cards)
  - Get card details
  - Freeze/unfreeze card
  - Cancel card
- [ ] Set up webhook handler for Lithic events:
  - `authorization` - Approve/decline based on account balance
  - `settlement` - Record settled transaction
  - `card.created`, `card.status_changed`
- [ ] Add ngrok/localtunnel for local webhook development
- [ ] Create mock Lithic adapter for offline development

### Deliverables
- POST /cards - Issue virtual card linked to account
- GET /cards - List user cards
- PATCH /cards/:id/freeze - Freeze card
- PATCH /cards/:id/unfreeze - Unfreeze card
- Webhook endpoint receiving and processing Lithic events
- Card transactions recorded in ledger

---

## Phase 5: Mock Deposit & Withdrawal Engine
**Status**: COMPLETED ✅

### Tasks
- [ ] Deposit service:
  - Simulate ACH deposit (random delay, mock clearing)
  - Simulate direct deposit/payroll
  - Admin/dev endpoint to trigger instant deposit
- [ ] Withdrawal service:
  - Simulate ACH withdrawal
  - Transfer between own accounts
- [ ] Transaction ledger:
  - Double-entry style recording
  - Transaction status: pending → completed | failed
- [ ] Add transaction metadata for rich history

### Deliverables
- POST /deposits/simulate - Trigger mock deposit
- POST /withdrawals - Request withdrawal
- POST /transfers - Transfer between accounts
- Transaction history with status and metadata

---

## Phase 6: Frontend Foundation
**Status**: COMPLETED ✅

### Tasks
- [ ] Set up React Router (or TanStack Router)
- [ ] Set up TanStack Query for server state
- [ ] Set up Zustand for client state
- [ ] Configure Tailwind with custom theme (bank colors)
- [ ] Create layout components:
  - Sidebar navigation
  - Top header with user info
  - Page container
- [ ] Add auth context and protected routes
- [ ] Create reusable UI components:
  - Button, Card, Input, Modal, Table, Badge
- [ ] Add loading states and error boundaries

### Deliverables
- Login page
- Dashboard layout with navigation
- Reusable component library started
- Auth flow working end-to-end

---

## Phase 7: Frontend Features
**Status**: COMPLETED ✅

### Tasks
- [ ] Dashboard page:
  - Account balance cards
  - Recent transactions list
  - Quick actions (deposit, transfer, create card)
- [ ] Accounts page:
  - List all accounts
  - Account detail with transaction history
- [ ] Cards page:
  - List virtual cards
  - Create new virtual card
  - Card detail with freeze/unfreeze
  - Show card number (mock/display)
- [ ] Transactions page:
  - Full transaction history with filters
  - Transaction detail modal
- [ ] Deposit/Transfer modals
- [ ] Profile/settings page

### Deliverables
- Complete UI for all API features
- Responsive design
- Real-time updates via TanStack Query

---

## Phase 8: Polish & Testing
**Status**: COMPLETED ✅

### Tasks
- [x] Add unit tests for services (Jest)
- [x] Add API integration tests (Jest + Supertest)
- [x] Add frontend component tests (Vitest + React Testing Library)
- [x] Add end-to-end tests scaffold (Playwright)
- [x] Add rate limiting to API (@nestjs/throttler)
- [x] Add request logging middleware
- [x] Performance optimization (Turbo pipeline)
- [x] Final documentation (DEMO.md)
- [x] Demo script/scenario

### Deliverables
- 61 API unit tests passing (9 test suites)
- 4 API integration tests passing
- 25 frontend component tests passing (4 suites)
- Playwright E2E scaffold with auth + dashboard tests
- Rate limiting: 100 requests per minute per IP
- HTTP request logging with colored status codes
- Full demo walkthrough in DEMO.md
- All builds passing

---

## Tech Choices Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo tool | pnpm workspaces | Lightweight, no extra tooling |
| ORM | Drizzle | SQL-native, type-safe, lightweight |
| API framework | NestJS | Service/repository pattern, mature |
| Frontend | Vite + React | Fast dev, modern |
| Styling | Tailwind CSS | Utility-first, fast prototyping |
| State (server) | TanStack Query | Caching, synchronization |
| State (client) | Zustand | Simple, minimal boilerplate |
| Validation | Zod | Schema validation, TS-native |
| Card Issuer | Lithic | Easiest sandbox, dev-first |
| Testing | Vitest + Playwright | Fast, modern |

---

## Notes
- All money is fake - no real payment processing
- Lithic sandbox only - no production card issuing
- Use ngrok for local webhook development
- Keep environment variables in `.env.local` (never commit)
