"use client";

import type { CoverageMetrics } from "@/lib/types";
import { useTheme } from "@/lib/useTheme";
import { THEME_COLORS } from "@/lib/theme-colors";

function bandColor(v: number, c: { fail: string; warn: string; info: string; pass: string }) {
  if (v < 60) return c.fail;
  if (v < 80) return c.warn;
  if (v < 90) return c.info;
  return c.pass;
}

const LABELS: { key: keyof CoverageMetrics; label: string }[] = [
  { key: "statements", label: "Statements" },
  { key: "branches", label: "Branches" },
  { key: "functions", label: "Functions" },
  { key: "lines", label: "Lines" },
];

export default function CoverageBars({
  coverage,
  compact = false,
}: {
  coverage: CoverageMetrics;
  compact?: boolean;
}) {
  const theme = useTheme();
  const c = THEME_COLORS[theme];

  return (
    <div className={compact ? "grid grid-cols-2 gap-x-5 gap-y-2" : "space-y-3"}>
      {LABELS.map(({ key, label }) => {
        const v = coverage[key];
        const color = bandColor(v, c);
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-mist uppercase tracking-wider">{label}</span>
              <span className="font-mono tabular-nums" style={{ color }}>
                {v}%
              </span>
            </div>
            <div className={`${compact ? "h-1" : "h-1.5"} w-full rounded-full bg-line overflow-hidden`}>
              <div
                className="h-full rounded-full"
                style={{ backgroundColor: color, width: `${v}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
