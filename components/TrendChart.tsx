"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/lib/useTheme";
import { THEME_COLORS, type ThemeName } from "@/lib/theme-colors";

export interface TrendPoint {
  timestamp: string;
  score: number;
  coverage: number;
}

function fmtTick(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtFull(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TrendChart({
  points,
  hideTitle = false,
}: {
  points: TrendPoint[];
  hideTitle?: boolean;
}) {
  const theme = useTheme();
  const c = THEME_COLORS[theme];
  const [showScore, setShowScore] = useState(true);
  const [showCoverage, setShowCoverage] = useState(true);

  const series = useMemo(() => {
    return [...points]
      .filter((p) => Number.isFinite(new Date(p.timestamp).getTime()))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((p) => ({
        ...p,
        label: fmtTick(p.timestamp),
      }));
  }, [points]);

  if (series.length === 0) {
    return (
      <div className="h-full min-h-[12rem] flex items-center justify-center text-xs text-mist px-8 py-16 text-center">
        No trend data yet
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0">
      <div className={`flex items-center ${hideTitle ? "justify-end" : "justify-between"} gap-2 mb-2`}>
        {hideTitle ? null : (
          <div className="text-xs uppercase tracking-widest text-mist">Score & coverage trend</div>
        )}
        <div className="flex items-center gap-2">
          <SeriesToggle
            active={showScore}
            color={c.pass}
            dashed={false}
            label="Score"
            onClick={() => setShowScore((v) => !v)}
          />
          <SeriesToggle
            active={showCoverage}
            color={c.info}
            dashed
            label="Coverage"
            onClick={() => setShowCoverage((v) => !v)}
          />
        </div>
      </div>

      <div className="h-[11.5rem]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={c.line} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: c.mist, fontSize: 11, fontFamily: "ui-monospace, monospace" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: c.mist, fontSize: 11, fontFamily: "ui-monospace, monospace" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: c.mist, strokeOpacity: 0.45 }}
              wrapperStyle={{ outline: "none" }}
              content={(props) => (
                <TrendTooltip
                  active={props.active}
                  payload={props.payload}
                  showScore={showScore}
                  showCoverage={showCoverage}
                  colors={c}
                />
              )}
            />
            <Line
              type="monotone"
              dataKey="coverage"
              name="Coverage"
              stroke={c.info}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, fill: c.info, stroke: c.panel, strokeWidth: 1.5 }}
              hide={!showCoverage}
              isAnimationActive
            />
            <Line
              type="monotone"
              dataKey="score"
              name="Score"
              stroke={c.pass}
              strokeWidth={2.25}
              dot={false}
              activeDot={{ r: 4, fill: c.pass, stroke: c.panel, strokeWidth: 1.5 }}
              hide={!showScore}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TrendTooltip({
  active,
  payload,
  showScore,
  showCoverage,
  colors,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: TrendPoint }>;
  showScore: boolean;
  showCoverage: boolean;
  colors: (typeof THEME_COLORS)[ThemeName];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="border border-line bg-panel2 rounded-xl px-2.5 py-1.5 text-[11px] font-mono shadow-xl shadow-black/5 dark:shadow-black/40">
      <div className="text-mist mb-0.5">{fmtFull(point.timestamp)}</div>
      <div className="flex gap-3">
        {showScore && <span style={{ color: colors.pass }}>Score {Math.round(point.score)}</span>}
        {showCoverage && (
          <span style={{ color: colors.info }}>Coverage {Math.round(point.coverage)}%</span>
        )}
      </div>
    </div>
  );
}

function SeriesToggle({
  active,
  color,
  dashed,
  label,
  onClick,
}: {
  active: boolean;
  color: string;
  dashed: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-mist hover:text-chalk"
      aria-pressed={active}
    >
      <span
        className="inline-block w-4 h-0.5 rounded-full"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${active ? color : "transparent"} 0 6px, transparent 6px 10px)`
            : active
              ? color
              : "transparent",
          outline: `1px solid ${active ? color : "currentColor"}`,
          opacity: active ? 1 : 0.35,
        }}
      />
      {label}
    </button>
  );
}
