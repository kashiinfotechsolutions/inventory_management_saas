# ScoopStock

A multi-tenant **inventory management and point-of-sale SaaS** for small retail businesses (built with Indian shops in mind: GST, HSN codes, INR, UPI).

Each business signs up as a *tenant*, gets its own isolated catalogue, stock, bills, users and reports, and pays for a subscription plan after a trial.

---

## What the system does

### 1. Accounts and multi-tenancy
- Self-service **signup** creates a tenant (business) and its first Owner user, starting on a trial.
- **Login / logout**, **forgot password** and **reset password** (emailed, expiring, hashed reset tokens).
- Security: bcrypt password hashing, JWT sessions, account lockout after repeated failed logins, Redis-backed rate limiting on auth endpoints.
- All data is scoped by `tenant_id`, so businesses never see each other's data.
- **Roles:** `OWNER`, `MANAGER`, `CASHIER`.
- Business profile: name, address, phone, GSTIN, state code, currency (default INR), timezone (default Asia/Kolkata).

### 2. Product catalogue and inventory
- Products with SKU, barcode, category, HSN code, unit, pack size, MRP, selling price, cost price, GST rate, image and active flag.
- SKU and barcode are unique per tenant.
- Live **quantity in stock** with a configurable **low-stock threshold** per product.
- Every change to stock is recorded in an immutable **stock movement** ledger: `PURCHASE`, `SALE`, `ADJUSTMENT`, `RETURN`, `WASTAGE`, `STOCK_SYNC`, each storing the change and the resulting quantity.

### 3. Bulk CSV upload
- **Product import** from CSV, with column mapping (mappings can be saved per tenant).
- **Restock** uploads in two modes:
  - `ADD_QUANTITY` adds the uploaded quantities to current stock.
  - `CLOSING_SYNC` sets stock to the uploaded closing count.
- Each upload is tracked as a batch (status, total / success / failed rows) with a row-level **error report**.

### 4. Purchases
- Record incoming stock from suppliers; stock levels and the movement ledger update automatically.

### 5. Point of sale (POS) and billing
- Fast checkout screen with **barcode scanning** to add items.
- GST bills with **CGST / SGST** split per line, order-level discount, round-off and grand total.
- Payment methods: Cash, Card, UPI, Other.
- Sequential, per-tenant **bill numbers**, and an **idempotency key** so a retried request never creates a duplicate bill.
- **Printable bill** after checkout.
- Bills can be marked `VOID`; line items keep a snapshot of name, SKU, HSN, MRP and tax at the time of sale.
- Stock is deducted and a `SALE` movement is written for each line.

### 6. Alerts
- Automatic `LOW_STOCK` and `OUT_OF_STOCK` alerts when stock crosses a product's threshold.
- Alerts can be active, resolved (stock replenished) or dismissed.

### 7. Dashboard and reports
- Dashboard overview: sales, top products, stock health, active alerts.
- Daily per-product **sales summary** (units, revenue, cost, profit) powering profit and sales reports.
- Sales history with bill drill-down.

### 8. Users, settings and audit
- Owners manage team members and their roles.
- Settings page for the business profile and tax details.
- **Audit log** of who did what and when, per tenant.

### 9. Subscription billing
- Plans with monthly and yearly pricing and usage limits.
- Subscription states: `TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELED`, `EXPIRED`.
- Checkout, payment verification and webhook handling through Razorpay (a Stripe customer/subscription ID field is also present in the schema).

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL via Prisma 5 |
| Cache / rate limit | Redis |
| Auth | `jose` (JWT), `bcryptjs` |
| Payments | Razorpay |
| Tests | Vitest |
| Monorepo | npm workspaces + Turborepo |

## Project structure

```
apps/
  web/                    Next.js app (UI + API routes)
    app/(dashboard)/      Dashboard, POS, inventory, sales, purchases,
                          reports, alerts, billing, users, settings, audit
    app/api/              REST route handlers (auth, products, sales,
                          purchases, uploads, billing, reports, ...)
    lib/                  auth, billing calculation, CSV import, rate limit,
                          Razorpay, mailer, Prisma client
    middleware.ts         Route protection
  api/
    prisma/               schema.prisma and migrations
```

## Getting started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL
- Redis (used for rate limiting; auth fails open if it is unreachable)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
# set DATABASE_URL and JWT_SECRET

# 3. Generate the Prisma client and run migrations
npm run db:generate
npm run db:migrate:dev

# 4. (Optional) seed data
npm run db:seed

# 5. Start the dev server
npm run dev
```

The app runs at http://localhost:3000.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign session tokens |
| `NEXT_PUBLIC_API_URL` | Public API base URL |
| `NODE_ENV` | `development` / `production` |

Razorpay keys, Redis and SMTP settings are also read by `lib/razorpay.ts`, `lib/redis.ts` and `lib/mailer.ts`; check those files for the exact variable names.

### Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the web app in development |
| `npm run build` | Production build |
| `npm run lint` | Lint via Turborepo |
| `npm run test` | Run tests via Turborepo |
| `npm run db:studio` | Open Prisma Studio |

## Core data model

`Tenant` → `User`, `Product`, `StockMovement`, `UploadBatch`, `Bill` → `BillItem`, `BillCounter`, `Alert`, `DailySalesSummary`, `AuditLog`, `Subscription` → `Plan`.
