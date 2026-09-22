# Arun Ice Cream & Dairy Products — Inventory & POS

A multi-tenant inventory, point-of-sale and billing platform for retail teams, built with Next.js (App Router), Prisma/PostgreSQL, Redis, and Razorpay.

## Stack

- **Web app + API**: Next.js 14 (App Router route handlers under `apps/web/app/api`)
- **Database**: PostgreSQL via Prisma, with row-level security policies scoping every tenant table
- **Cache / rate limiting**: Redis (`ioredis`)
- **Payments**: Razorpay (Orders + Checkout + webhooks)
- **Email**: SMTP via `nodemailer`, with a console-log fallback in local dev

## Local setup

1. **Start infrastructure**

   ```bash
   docker-compose up -d postgres redis
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` (and `apps/web/.env.example` to `apps/web/.env.local`) and fill in:

   | Variable | Purpose |
   | --- | --- |
   | `DATABASE_URL` | Postgres connection string |
   | `JWT_SECRET` | Signs session cookies — use a long random value in production |
   | `REDIS_URL` | Used for login/signup rate limiting |
   | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | From the [Razorpay dashboard](https://dashboard.razorpay.com/app/keys) (use test-mode keys locally) |
   | `RAZORPAY_WEBHOOK_SECRET` | Set when configuring the webhook in the Razorpay dashboard (see below) |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Optional — password-reset emails are logged to the server console when unset |

4. **Run database migrations and seed data**

   ```bash
   npm run db:generate
   npm run db:migrate:dev
   npm run db:seed
   ```

   The seed script creates a demo tenant (`demo-store`) with owner login `owner@demo.arundairy.local` / `Demo@12345`.

5. **Start the app**

   ```bash
   npm run dev
   ```

## Razorpay test-mode flow

1. Add your Razorpay **test-mode** `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` to `apps/web/.env.local`.
2. In the Razorpay dashboard, add a webhook pointing to `https://<your-host>/api/billing/webhook` for the `payment.captured` and `payment.failed` events, and copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`. (For local testing, use the Razorpay CLI or a tunnel like ngrok.)
3. On the **Billing** page, choose a plan — this opens Razorpay Checkout. Use a [Razorpay test card](https://razorpay.com/docs/payments/payments/test-card-upi-details/) to complete payment.
4. On success, `POST /api/billing/verify` activates the subscription immediately; the webhook is a durable fallback in case that call never completes.

## CSV bulk import

- **Inventory → Import products (CSV)**: creates or updates products by SKU.
- **Purchases → Bulk restock (CSV)**: adds to or overwrites (`closing stock sync`) quantities by SKU.

Both accept up to 5,000 rows per file and report per-row errors without failing the whole batch.

## Tests

```bash
npm run test
```

Runs the Vitest suite (`apps/web/lib/*.test.ts`) covering GST/total calculations, CSV row validation, Razorpay signature verification, and session token handling.

## Known limitations

- Password reset does not revoke an already-issued session JWT (no session/token store to revoke against) — the new password takes effect for future logins.
- Next.js is pinned to the latest `14.2.x` patch; some of its bundled sub-dependencies (e.g. an internally vendored PostCSS) still show in `npm audit` and will only clear on a Next.js 15 upgrade, which is a larger, separate migration.
- CSV imports are processed synchronously within one request/transaction (no background job queue) — fine at the current row cap, but large recurring imports would benefit from a queue in the future.
