# Mock Bank Demo Script

## Demo: Full Banking Flow

This script walks through all features of the mock bank application.

---

## Prerequisites

```bash
# 1. Start the database
cd /path/to/mock-bank
docker-compose up -d postgres

# 2. Run migrations
pnpm db:migrate

# 3. Start both API and web (in separate terminals)
pnpm dev
```

---

## Flow 1: Authentication

### 1.1 Register a new user
- Navigate to: http://localhost:5173/register
- Fill in:
  - Email: `demo@example.com`
  - Password: `password123`
  - First Name: `Demo`
  - Last Name: `User`
- Click "Create Account"
- You should be redirected to Dashboard

### 1.2 Logout and Login
- Click "Logout" in the sidebar
- You should be redirected to Login
- Enter credentials and sign in

---

## Flow 2: Accounts

### 2.1 View Dashboard
- Dashboard shows:
  - Total Balance across all accounts
  - List of accounts (initially empty)
  - Recent Transactions (initially empty)

### 2.2 Create Accounts
- Click "New Account" button
- Create a **Checking** account → note the account number
- Create a **Savings** account → note the account number
- Dashboard now shows both accounts with $0 balance

---

## Flow 3: Deposits

### 3.1 Deposit to Checking
- Click "Deposit" quick action or go to Transactions
- Select Checking account
- Enter Amount: `$1000`
- Enter Description: "Initial deposit"
- Submit
- Verify balance updates on Dashboard

### 3.2 Deposit to Savings
- Repeat with `$500` to Savings account

---

## Flow 4: Cards (Virtual Card Issuing)

### 4.1 Create a Virtual Card
- Navigate to Cards page
- Click "Add New Card"
- Select the Checking account
- Enter a nickname: "Demo Card"
- Submit

### 4.2 View Card Details
- Card appears with:
  - Last 4 digits (from Lithic sandbox)
  - Status: Active
  - Account linked
- Note: Full card number is shown (sandbox only!)

### 4.3 Charge the Card (Network / acquirer API)
Cards are charged the way a real merchant would — through the bank's card-acceptance ("Network")
API, which routes to the Lithic processor. The processor creates a **Transaction**, asks the
program to approve it in real time via **ASA** (which places an authorization hold), then the
merchant captures it (**CLEARING**) to settle.

```bash
# Authorize — ASA decisions this and places a hold (reduces available, not posted balance)
curl -X POST http://localhost:3000/api/network/authorizations \
  -H "Authorization: Bearer sk_test_luckyspin_dev" -H "Content-Type: application/json" \
  -d '{ "card": { "number": "4111111111111111", "expMonth": "12", "expYear": "2030", "cvv": "123" },
        "amount": 5000, "currency": "USD", "merchant": { "name": "Coffee Shop", "mcc": "5814" } }'
# → { "id": "txn_…", "approved": true, "authCode": "…" }

# Capture — emits a CLEARING event and settles to the ledger (card_clearing)
curl -X POST http://localhost:3000/api/network/authorizations/<txn_token>/capture \
  -H "Authorization: Bearer sk_test_luckyspin_dev" -H "Content-Type: application/json" -d '{}'
```
- Verify: the card's transactions show the Lithic Transaction with its `events[]`
  (`AUTHORIZATION` → `CLEARING`); the checking balance settles; the activity appears in Transactions.

### 4.4 Freeze/Unfreeze Card
- Click "Freeze" on the Demo Card
- Status changes to "Frozen"
- Try simulate transaction → should fail
- Click "Unfreeze" → card is active again

---

## Flow 5: Transfers

### 5.1 Transfer Between Own Accounts
- Go to Transactions → Transfer
- From: Checking
- To: Savings
- Amount: `$200`
- Submit
- Verify:
  - Checking balance decreased by $200
  - Savings balance increased by $200
  - Both accounts show the transfer transaction

---

## Flow 6: Withdrawals

### 6.1 Withdraw from Checking
- Click "Withdraw" quick action
- Select Checking account
- Amount: `$100`
- Submit
- Verify balance decreased

---

## Flow 7: Transaction History

### 7.1 View All Transactions
- Navigate to Transactions page
- See all transactions with:
  - Type badges (Deposit, Withdrawal, Transfer, Card)
  - Amounts with +/- indicators
  - Descriptions
  - Timestamps

### 7.2 Filter by Account
- Use account filter dropdown
- Only shows transactions for selected account

---

## Flow 8: Webhooks (Lithic)

The bank consumes Lithic's real webhook events (`transaction.created`, `transaction.updated`,
`payment_transaction.created`, `payment_transaction.updated`, `card.created`, `card.updated`) and
posts to the ledger based on the network event type in `payload.events[]` (e.g. `CLEARING` →
`card_clearing`, `RETURN` → `return`, `ACH_ORIGINATION_SETTLED` → `ach_debit`/`ach_credit`). In mock
mode the processor dispatches these in-process; the endpoint below is for real Lithic delivery,
which is **Svix-signed** (headers `webhook-id`, `webhook-timestamp`, `webhook-signature`; secret
`whsec_…`, set via `LITHIC_WEBHOOK_SECRET`).

### 8.1 Transaction cleared (settlement)
```bash
curl -X POST http://localhost:3000/api/webhooks/lithic \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_001",
    "type": "transaction.updated",
    "payload": {
      "token": "txn_demo-001",
      "account_token": "account_1",
      "card_token": "card_…",
      "amount": 2500, "settled_amount": 2500,
      "status": "SETTLED", "result": "APPROVED",
      "merchant": { "descriptor": "Test Merchant", "mcc": "5411" },
      "events": [
        { "token": "e1", "type": "AUTHORIZATION", "amount": 2500, "result": "APPROVED" },
        { "token": "e2", "type": "CLEARING", "amount": 2500, "result": "APPROVED" }
      ]
    }
  }'
```

### 8.2 ACH payment settled
```bash
curl -X POST http://localhost:3000/api/webhooks/lithic \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_002",
    "type": "payment_transaction.updated",
    "payload": {
      "token": "pmt_demo-001", "category": "ACH", "direction": "DEBIT",
      "status": "SETTLED", "financial_account_token": "account_1", "amount": 2500,
      "events": [ { "token": "pe1", "type": "ACH_ORIGINATION_SETTLED", "amount": 2500, "result": "APPROVED" } ]
    }
  }'
```

---

## Flow 9: Settings

### 9.1 View Profile
- Navigate to Settings
- View current user info
- (Profile editing can be added in future)

---

## API Endpoints Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create user |
| `/api/auth/login` | POST | Get JWT token |
| `/api/accounts` | GET | List accounts |
| `/api/accounts` | POST | Create account |
| `/api/accounts/:id/deposit` | POST | Deposit funds |
| `/api/accounts/:id/withdraw` | POST | Withdraw funds |
| `/api/transfers` | POST | Transfer between accounts |
| `/api/cards` | GET | List cards |
| `/api/cards` | POST | Create virtual card |
| `/api/cards/:id/simulate` | POST | Simulate card transaction |
| `/api/cards/:id/freeze` | POST | Freeze card |
| `/api/cards/:id/unfreeze` | POST | Unfreeze card |
| `/api/transactions` | GET | List transactions |
| `/api/webhooks/lithic` | POST | Lithic webhook endpoint |
| `/api/docs` | GET | Swagger UI |

---

## Tech Stack

- **API**: NestJS + Drizzle ORM + PostgreSQL
- **Frontend**: Vite + React + Tailwind CSS
- **Card Issuing**: Lithic (Sandbox)
- **Testing**: Jest (API) + Vitest (Web) + Playwright (E2E)
- **Security**: JWT auth, bcrypt, rate limiting (100 req/min)

---

## Notes

- All money is fake - no real payment processing
- Lithic sandbox only - no production card issuing
- Webhook endpoints accept Lithic sandbox events
- Rate limiting: 100 requests per minute per IP
