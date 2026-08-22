# Expance

**Know where the money went.** Expance is a self-hosted, mobile-first expense,
income and settlement tracker for two kinds of shared money:

- **Project spaces** — you and a co-founder both spend on a product from your
  own pockets. Expance tracks who paid what, keeps a live *contribution
  balance* ("he owes you ₹20,000 to stay 50/50"), records settlements when
  someone pays the other back, and shows profit with each member's share.
- **Personal spaces** — you and your family spend from shared money. Expance
  tracks who spent what and on what, sets monthly budgets that warn *during*
  the month (not after the credit card statement arrives), and shows how much
  of the month landed on the credit card.

Built as an installable PWA with a design inspired by the *bahi khata* — the
red cloth-bound ledger book Indian shops have always run on.

## Features

- **Spaces** — isolated ledgers with their own members, categories and
  currency. Members of one space can never see another.
- **Fast entry** — amount, category, who paid, payment method (UPI / credit
  card / cash / bank), date, note, optional receipt photo. Seconds on a phone.
- **Multi-currency** — earn in USD, spend in INR. Entries store the original
  amount, the exchange rate on that date (via the free
  [Frankfurter](https://frankfurter.dev) API) and the converted amount, so
  history never shifts when rates move.
- **Contribution balance & settlements** — computed live from the ledger,
  never stored, so it is always provably correct. Custom share splits
  (50/50, 70/30, …) per project.
- **Budgets** — monthly overall and per-category limits with overspend
  callouts ("over by ₹700"), one-tap copy from last month.
- **Analytics** — weekly or monthly spent-vs-income columns, category donut,
  who-spent and payment-method breakdowns. Chart colors are validated for
  colorblind safety; every chart has a table view.
- **Full ledger** — filter by date presets or custom range, member, and
  expense/income, with totals for the selection.
- **Receipts** — photos stored outside the web root, served only through a
  membership-checked route.
- **Soft deletes everywhere** — money records are never erased, only hidden.
- **QR invites** — every space has its own invite QR. Scanning it joins the
  space, creating an account on the spot for people who don't have one.
  Owners can regenerate the QR to revoke everything shared before.

## Stack

| Layer | Choice |
|---|---|
| App | [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS |
| Database | MySQL via [Prisma 7](https://www.prisma.io) (`@prisma/adapter-mariadb`) |
| Auth | [Auth.js v5](https://authjs.dev) credentials login, bcrypt hashes |
| Charts | Hand-rolled inline SVG/CSS — no chart library |
| Fonts | IBM Plex Sans + IBM Plex Mono (money is always mono + tabular) |

One codebase, one Node process: Next.js server actions are the backend.

## Getting started

Requirements: Node.js 20+, MySQL 8.

1. **Create the database and a dedicated user** (least privilege):

   ```sql
   CREATE DATABASE expance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'expance_user'@'localhost' IDENTIFIED BY '<strong password>';
   GRANT ALL PRIVILEGES ON expance.* TO 'expance_user'@'localhost';
   ```

   Dev only: Prisma Migrate also needs a shadow database —
   `GRANT CREATE, ALTER, DROP, REFERENCES ON *.* TO 'expance_user'@'localhost';`
   (the production app user needs no DDL rights).

2. **Configure the environment:**

   ```bash
   cp .env.example .env
   # set DATABASE_URL, and AUTH_SECRET (npx auth secret)
   ```

3. **Install and migrate:**

   ```bash
   npm install
   npx prisma migrate dev
   ```

4. **Run it:**

   ```bash
   npm run dev
   ```

   Register your account, create a space, invite people with its QR (or by
   email if they already have an account), start entering.
   (`scripts/create-user.ts` still exists for creating accounts from the
   command line if you ever need it.)

## Production notes

- `npm ci && npx prisma migrate deploy && npm run build && npm start`
  (or run under PM2), behind Nginx with HTTPS — TLS is required for PWA
  install and service workers.
- Set `AUTH_URL` to the public URL.
- Keep MySQL bound to localhost.
- **Back up nightly** — `mysqldump expance` to a different machine via cron.
  This database is your financial system of record.
- Receipt photos live in `uploads/` next to the app; include that directory
  in backups.

## Data model

```
users ─┬─ space_members ─── spaces ─┬─ categories
       │   (role, share %)          ├─ transactions  (amount, currency, fx rate,
       │                            │                 payer, category, method,
       └────────────────────────────┤                 date, receipt, soft-delete)
                                    ├─ settlements   (from → to, amount)
                                    └─ budgets       (month, category, limit)
```

Contribution balances, profit splits and all totals are computed from the
ledger at read time — nothing derived is ever stored.

## Status

Under active development. Deployment target: [expance.space](https://expance.space).
