"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/lib/useTheme";
import { THEME_COLORS } from "@/lib/theme-colors";
import { cardClass, chipActiveClass, chipClass, chipIdleClass } from "@/lib/ui";

export type OverviewChartTab = "projects" | "scores";
export type OverviewTimeRange = "all" | "week" | "month" | "year";

export type OverviewChartRow = {
  clientId: string;
  name: string;
  fullName: string;
  projects: number;
  score: number;
  reports: number;
};

export type OverviewRankingRow = {
  id: string;
  name: string;
  projects: number;
  score: number;
  reports: number;
};

function fmtRangeLabel(range: OverviewTimeRange) {
  const end = new Date();
  const start = new Date();
  if (range === "week") start.setDate(end.getDate() - 7);
  else if (range === "month") start.setDate(end.getDate() - 30);
  else if (range === "year") start.setFullYear(end.getFullYear() - 1);
  else start.setFullYear(end.getFullYear() - 3);
  const f = (d: Date) =>
    d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${f(start)} ~ ${f(end)}`;
}

export default function AdminOverviewCharts({
  chartRows,
  ranking,
  tab,
  range,
  selectedId,
  onTab,
  onRange,
  onSelect,
  onClear,
}: {
  chartRows: OverviewChartRow[];
  ranking: OverviewRankingRow[];
  tab: OverviewChartTab;
  range: OverviewTimeRange;
  selectedId: string | null;
  onTab: (tab: OverviewChartTab) => void;
  onRange: (range: OverviewTimeRange) => void;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const theme = useTheme();
  const colors = THEME_COLORS[theme];

  return (
    <div id="admin-charts" className={`${cardClass} p-5 lg:p-6`}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          {(
            [
              ["projects", "Projects"],
              ["scores", "Scores"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              className={`${chipClass} ${tab === id ? chipActiveClass : chipIdleClass}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "All"],
              ["week", "Week"],
              ["month", "Month"],
              ["year", "Year"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onRange(id)}
              className={`${chipClass} ${range === id ? chipActiveClass : chipIdleClass}`}
            >
              {label}
            </button>
          ))}
          <span className="text-[11px] font-mono text-mist border border-line rounded-full px-3 py-1.5">
            {fmtRangeLabel(range)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6">
        <div className="min-h-[280px] h-[320px]">
          {chartRows.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-mist">
              No clients in this filter.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartRows}
                margin={{ top: 8, right: 8, left: -12, bottom: 8 }}
                onClick={(state) => {
                  const id = (state as { activePayload?: { payload?: { clientId?: string } }[] })
                    ?.activePayload?.[0]?.payload?.clientId;
                  if (id) onSelect(id);
                }}
              >
                <CartesianGrid stroke={colors.line} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: colors.mist, fontSize: 11, fontFamily: "ui-monospace, monospace" }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: colors.mist, fontSize: 11, fontFamily: "ui-monospace, monospace" }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  domain={tab === "scores" ? [0, 100] : [0, "auto"]}
                />
                <Tooltip
                  cursor={{ fill: colors.pass, fillOpacity: 0.08 }}
                  content={({ active, payload }) => {
                    const row = payload?.[0]?.payload as OverviewChartRow | undefined;
                    if (!active || !row) return null;
                    return (
                      <div className="border border-line bg-panel2 rounded-xl px-2.5 py-1.5 text-[11px] font-mono shadow-xl">
                        <div className="text-chalk mb-0.5">{row.fullName}</div>
                        <div className="text-mist">{row.projects} projects</div>
                        <div className="text-mist">
                          {row.reports} reports · score {row.score || "—"}
                        </div>
                        <div className="text-signal-pass mt-1">Click to focus</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey={tab === "scores" ? "score" : "projects"} radius={[6, 6, 0, 0]} maxBarSize={36} cursor="pointer">
                  {chartRows.map((row) => (
                    <Cell
                      key={row.clientId}
                      fill={selectedId === row.clientId ? colors.pass : colors.info}
                      fillOpacity={selectedId && selectedId !== row.clientId ? 0.35 : 0.9}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-mist mb-3">
            {tab === "scores" ? "Score ranking" : "Project ranking"}
          </div>
          <ol className="space-y-1">
            {ranking.length === 0 ? (
              <li className="text-sm text-mist py-6 text-center">Nothing to rank yet.</li>
            ) : (
              ranking.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                      selectedId === c.id
                        ? "bg-signal-pass/10 text-signal-pass"
                        : "hover:bg-panel2 hover:text-signal-pass text-chalk"
                    }`}
                  >
                    <span
                      className={`h-6 w-6 shrink-0 rounded-full text-[11px] font-mono flex items-center justify-center ${
                        i < 3
                          ? "bg-chalk text-panel dark:bg-signal-pass dark:text-onaccent"
                          : "bg-panel2 text-mist border border-line"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm">{c.name}</span>
                    <span className="text-xs font-mono tabular-nums text-mist">
                      {tab === "scores" ? (c.score ? c.score : "—") : c.projects}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ol>
          {selectedId && (
            <button
              type="button"
              onClick={onClear}
              className="mt-3 text-[11px] font-mono text-mist hover:text-signal-pass"
            >
              Clear focus
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
