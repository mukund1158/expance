# Expance

Private expense, income and settlement tracker for project spaces (co-founder
contribution balance, profit split) and personal spaces (budgets, who-spent-what,
credit card visibility). Mobile-first PWA.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind) — frontend + backend in one app
- **MySQL** via **Prisma 7** (`@prisma/adapter-mariadb` driver adapter)
- **Auth.js v5** — credentials login (no public sign-up; users are created by script)

## Local setup

1. Create the database and a dedicated MySQL user (least privilege — this app
   only needs this one database):

   ```sql
   CREATE DATABASE expance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'expance_user'@'localhost' IDENTIFIED BY '<strong password>';
   GRANT ALL PRIVILEGES ON expance.* TO 'expance_user'@'localhost';
   ```

   Prisma migrations also need a shadow database in dev; the simplest option is
   to also grant: `GRANT CREATE, ALTER, DROP, REFERENCES ON *.* TO 'expance_user'@'localhost';`
   (dev machine only — in production the app user needs no DDL rights).

2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `AUTH_SECRET`
   (`npx auth secret` or `openssl rand -base64 32`).

3. Apply the schema and generate the client:

   ```bash
   npx prisma migrate dev --name init
   ```

4. Create your users (private app — no sign-up page):

   ```bash
   USER_PASSWORD='...' npx tsx scripts/create-user.ts "Mukund" mukund@example.com
   ```

5. Run it:

   ```bash
   npm run dev
   ```

## Production notes (own server)

- Run with PM2 behind Nginx with HTTPS (Let's Encrypt). HTTPS is required for
  PWA install and service workers.
- Set `AUTH_URL` to the public URL in `.env`.
- Keep MySQL bound to localhost.
- **Back up nightly**: `mysqldump expance` to a different machine/location via
  cron. This database is the financial system of record.
- Deploy: `npm ci && npx prisma migrate deploy && npm run build && pm2 restart expance`

## Data model (summary)

- `spaces` — isolated ledgers (`PROJECT` or `PERSONAL`), each with members
- `space_members` — membership + `share_percent` for project profit split
- `transactions` — expense/income; stores original amount, currency, fx rate and
  converted base amount; who paid; category; payment method; soft-deleted only
- `settlements` — member-to-member balancing payments (not expenses, excluded from P&L)
- `budgets` — monthly budgets per category (personal spaces)

Contribution balances are always computed from the ledger, never stored.
