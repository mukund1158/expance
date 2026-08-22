"use client";

import { useEffect } from "react";

// After a deploy, pages opened before it reference JS chunks that no longer
// exist. Instead of showing the "This page couldn't load" screen, reload once
// to pick up the new build. Rate-limited so a real outage can't loop reloads.
const KEY = "expance-chunk-reload-at";
const MIN_INTERVAL_MS = 30_000;

function isChunkError(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /ChunkLoadError|Failed to load chunk|Loading chunk [^ ]* failed/i.test(value)
  );
}

export function ChunkReloadGuard() {
  useEffect(() => {
    const reloadOnce = () => {
      try {
        const last = Number(sessionStorage.getItem(KEY) ?? 0);
        if (Date.now() - last < MIN_INTERVAL_MS) return;
        sessionStorage.setItem(KEY, String(Date.now()));
      } catch {
        // sessionStorage unavailable — still better to reload than to strand.
      }
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const err = event.error as { name?: string; message?: string } | undefined;
      if (isChunkError(event.message) || isChunkError(err?.name) || isChunkError(err?.message)) {
        reloadOnce();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { name?: string; message?: string } | undefined;
      if (isChunkError(reason?.name) || isChunkError(reason?.message)) {
        reloadOnce();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
