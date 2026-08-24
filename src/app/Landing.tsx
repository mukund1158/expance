import Link from "next/link";

/* A real slice of the product, not a screenshot: the hero is a ledger card. */
function HeroLedger() {
  return (
    <div className="spine w-full max-w-sm rounded-r-xl border border-line bg-paper-raised p-4 shadow-sm">
      <p className="eyebrow">NoonLaunch · Project</p>
      <ul className="mt-3 divide-y divide-line-soft text-sm">
        <li className="flex items-baseline justify-between py-2">
          <span>
            Server for launch
            <span className="ml-1.5 text-xs text-ink-muted">Mukund · bank</span>
          </span>
          <span className="amount font-semibold">−₹10,000.00</span>
        </li>
        <li className="flex items-baseline justify-between py-2">
          <span>
            First customer
            <span className="ml-1.5 text-xs text-ink-muted">$120 · Stripe</span>
          </span>
          <span className="amount font-semibold text-credit">+₹10,572.00</span>
        </li>
        <li className="flex items-baseline justify-between py-2">
          <span>
            Ads
            <span className="ml-1.5 text-xs text-ink-muted">Rahul · credit card</span>
          </span>
          <span className="amount font-semibold">−₹4,000.00</span>
        </li>
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3 text-sm">
        <span className="font-medium">Rahul owes Mukund</span>
        <span className="amount font-semibold text-red">₹3,000.00</span>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-12">
      <header className="flex items-center justify-between py-4">
        <span className="text-lg font-bold tracking-tight">Expance</span>
        <Link href="/login" className="btn-quiet">
          Sign in
        </Link>
      </header>

      <section className="py-10">
        <p className="eyebrow">The shared money ledger</p>
        <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight">
          Know where the money went.
        </h1>
        <p className="mt-4 text-ink-muted">
          You build a product with a co-founder. You run a home with your
          family. Money leaves from everyone&apos;s pockets — and at month end,
          nobody can say where. Expance is the ledger you both write in.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/register" className="btn-primary flex-1 py-3 text-center">
            Start your ledger
          </Link>
        </div>
      </section>

      <section className="flex justify-center pb-12">
        <HeroLedger />
      </section>

      <section className="space-y-4 pb-12">
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <h2 className="font-semibold">For projects you build together</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Every expense records who paid. A live contribution balance shows
            who owes whom to stay at your agreed split — 50/50 or any other.
            Record settlements when someone pays back. See profit and each
            person&apos;s share.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <h2 className="font-semibold">For the home you run together</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Who spent what, on what, by cash or card. Monthly budgets that warn
            you on the 18th, not the 31st — including how much of the month is
            already sitting on the credit card.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <h2 className="font-semibold">Built like a ledger, not a toy</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Earn in USD, spend in INR — every entry keeps the exchange rate of
            its day, so history never shifts. Nothing is ever erased, only
            hidden. Invite family with a QR code. Installs on your phone as an
            app.
          </p>
        </div>
      </section>

      <footer className="border-t border-line-soft pt-6 text-center text-sm text-ink-muted">
        <p>
          Open source —{" "}
          <a
            href="https://github.com/mukund1158/expance"
            className="font-medium text-red"
            rel="noopener"
          >
            github.com/mukund1158/expance
          </a>
        </p>
        <p className="mt-1">Self-host it, or use it here. Your money, your data.</p>
      </footer>
    </main>
  );
}
