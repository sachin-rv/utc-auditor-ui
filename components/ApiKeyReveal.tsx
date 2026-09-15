"use client";

import { useState } from "react";
import { btnPrimaryClass, btnSecondaryClass } from "@/lib/ui";

export default function ApiKeyReveal({
  plainKey,
  message,
  onDone,
  doneLabel = "Done",
}: {
  plainKey: string;
  message: string;
  onDone: () => void;
  doneLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(plainKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-signal-warn">{message}</p>
      <p className="text-xs text-mist">
        Store this as <span className="font-mono text-chalk">UTC_AUDITOR_API_KEY</span> in CI secrets.
        Only the hash is saved — this value will not be shown again.
      </p>
      <div className="bg-panel2 border border-line rounded-xl px-3 py-2 font-mono text-xs break-all">
        {plainKey}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={copy} className={btnSecondaryClass}>
          {copied ? "Copied" : "Copy key"}
        </button>
        <button type="button" onClick={onDone} className={btnPrimaryClass}>
          {doneLabel}
        </button>
      </div>
    </div>
  );
}
