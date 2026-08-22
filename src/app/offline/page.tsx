export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-dashed border-line p-8 text-center">
        <p className="text-2xl">📕</p>
        <p className="mt-2 font-medium">You&apos;re offline</p>
        <p className="mt-1 text-sm text-ink-muted">
          Expance needs a connection to read and write your ledger. Reconnect
          and pull to refresh.
        </p>
      </div>
    </main>
  );
}
