"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { btnPrimaryClass, btnSecondaryClass, emptyStateClass } from "@/lib/ui";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reloading, setReloading] = useState(false);
  const busy = pending || reloading;
  const unreachable = /cannot reach the utc auditor api/i.test(error.message);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "utc-hide-next-overlay";
    style.textContent = "nextjs-portal{display:none!important}";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  function retry() {
    setReloading(true);
    startTransition(() => {
      reset();
      router.refresh();
    });
    window.location.reload();
  }

  return (
    <div id="dashboard-error" className={`${emptyStateClass} text-chalk m-5 sm:m-8`}>
      <div className="text-xs font-mono uppercase tracking-widest text-signal-fail mb-2">
        {unreachable ? "API unavailable" : "API error"}
      </div>
      <h1 className="font-display text-2xl font-bold mb-2">
        {unreachable ? "Could not reach the API" : "Could not load this view"}
      </h1>
      <p className="text-sm text-mist mb-6">
        {error.message || "The UTC Auditor API returned an error."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          id="dashboard-error-retry"
          type="button"
          onClick={retry}
          disabled={busy}
          className={btnPrimaryClass}
        >
          {busy ? "Retrying…" : "Try again"}
        </button>
        <button
          id="dashboard-error-home"
          type="button"
          onClick={() => {
            setReloading(true);
            window.location.assign("/dashboard");
          }}
          disabled={busy}
          className={btnSecondaryClass}
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}
