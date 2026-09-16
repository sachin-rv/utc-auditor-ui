"use client";

import type { CoverageMetrics } from "@/lib/types";
import { useTheme } from "@/lib/useTheme";
import { THEME_COLORS } from "@/lib/theme-colors";
import { motion, useReducedMotion } from "framer-motion";

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
  const reduced = useReducedMotion();

  return (
    <div className={compact ? "grid grid-cols-2 gap-x-5 gap-y-2" : "space-y-3"}>
      {LABELS.map(({ key, label }, i) => {
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
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${v}%` }}
                transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
