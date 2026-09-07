"use client";

import { btnPrimaryClass, emptyStateClass } from "@/lib/ui";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={`${emptyStateClass} text-chalk m-5 sm:m-8`}>
      <div className="text-xs font-mono uppercase tracking-widest text-signal-fail mb-2">API error</div>
      <h1 className="font-display text-2xl font-bold mb-2">Could not load this view</h1>
      <p className="text-sm text-mist mb-6">{error.message || "The UTC Auditor API returned an error."}</p>
      <button onClick={reset} className={btnPrimaryClass}>
        Try again
      </button>
    </div>
  );
}
