"use client";

import { useTheme } from "@/lib/useTheme";
import { THEME_COLORS } from "@/lib/theme-colors";
import { motion, useReducedMotion } from "framer-motion";

function bandColor(score: number, c: { fail: string; warn: string; info: string; pass: string }) {
  if (score < 60) return c.fail;
  if (score < 80) return c.warn;
  if (score < 90) return c.info;
  return c.pass;
}

function bandLabel(score: number) {
  if (score < 60) return "Critical improvement area";
  if (score < 80) return "Needs improvement";
  if (score < 90) return "Good baseline";
  return "Strong coverage";
}

export default function ScoreDial({
  score,
  size = 156,
  label = "Overall Score",
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const theme = useTheme();
  const c = THEME_COLORS[theme];
  const shown = Math.max(1, Math.round(score));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, shown)) / 100;
  const dash = circumference * pct;
  const color = bandColor(shown, c);
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.line} strokeWidth={stroke} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            initial={reduced ? false : { strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${dash} ${circumference - dash}` }}
            transition={{ duration: reduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold tabular-nums" style={{ color }}>
            {shown}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-mist mt-0.5">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-mist">{label}</div>
        <div className="text-sm font-medium mt-0.5" style={{ color }}>
          {bandLabel(shown)}
        </div>
      </div>
    </div>
  );
}
