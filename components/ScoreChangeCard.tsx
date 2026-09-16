"use client";

import { cardClass } from "@/lib/ui";
import type { ScoreChange } from "@/lib/score-change";

export default function ScoreChangeCard({ change }: { change: ScoreChange }) {
  const tone =
    change.direction === "up"
      ? "text-signal-pass border-signal-pass/30 bg-signal-pass/10"
      : change.direction === "down"
        ? "text-signal-fail border-signal-fail/30 bg-signal-fail/10"
        : "text-mist border-line bg-panel2/40";

  return (
    <section className={`${cardClass} p-5`}>
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-mist mb-2">
        Why the score changed
      </div>
      <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium mb-3 ${tone}`}>
        {change.headline}
      </div>
      <ul className="space-y-1.5 text-sm text-chalk">
        {change.reasons.map((reason) => (
          <li key={reason} className="flex gap-2">
            <span className="text-mist mt-0.5">•</span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
