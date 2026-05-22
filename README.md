# Mock Bank

A complete mock bank application using real card issuing technology (Lithic sandbox) with simulated money.

## Tech Stack

- **API**: NestJS with service/repository pattern
- **Frontend**: Vite + React + Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **Card Issuer**: Lithic (sandbox API)
- **Monorepo**: pnpm workspaces + Turbo

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Start the database**
   ```bash
   docker-compose up -d
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values (especially Lithic API key)
   ```
   > **⚠️ Security:** Never commit real API keys or secrets. `.env.local` is gitignored for this reason. The tracked `.env` only contains safe development defaults.

4. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

5. **Seed the database (optional)**
   ```bash
   pnpm db:seed
   ```

6. **Start development servers**
   ```bash
   pnpm dev
   ```

   - API: http://localhost:3000
   - Web: http://localhost:5173
   - Swagger Docs: http://localhost:3000/api/docs

### Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed database with test data |
| `pnpm db:studio` | Open Drizzle Studio (database GUI) |
| `pnpm db:generate` | Generate migration from schema changes |

## Project Structure

```
mock-bank/
├── apps/
│   ├── api/               # NestJS API
│   └── web/               # Vite React frontend
├── packages/
│   ├── database/          # Drizzle ORM schema + migrations
│   └── types/             # Shared TypeScript types
├── docker-compose.yml     # PostgreSQL + Redis
└── PROJECT_PLAN.md        # Detailed project plan
```

## Phases

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the full breakdown.

1. ✅ Project Scaffolding
2. ✅ Database Schema & Drizzle ORM
3. ✅ Core Banking API
4. ✅ Lithic Card Integration
5. ✅ Mock Deposit/Withdrawal Engine
6. ✅ Frontend Foundation
7. ✅ Frontend Features
8. 🔄 Polish & Testing (in progress)

## License

MIT
