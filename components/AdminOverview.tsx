"use client";

import { useMemo, useState } from "react";
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
import type { ReactNode } from "react";
import { Building2, FolderKanban, Activity, ShieldCheck } from "lucide-react";
import ClientListPanel, { type ClientRow } from "@/components/ClientListPanel";
import CreateClientButton from "@/components/CreateClientButton";
import CreateUserButton from "@/components/CreateUserButton";
import { useTheme } from "@/lib/useTheme";
import { THEME_COLORS } from "@/lib/theme-colors";
import { cardClass, chipActiveClass, chipClass, chipIdleClass } from "@/lib/ui";
import type { OverviewReportPoint } from "@/lib/load-admin-overview";
import type { ApiProject } from "@/lib/api-types";

type StatusFilter = "all" | "active" | "empty";
type ChartTab = "projects" | "scores";
type TimeRange = "all" | "week" | "month" | "year";

function inRange(iso: string, range: TimeRange) {
  if (range === "all") return true;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  const now = Date.now();
  const days = range === "week" ? 7 : range === "month" ? 30 : 365;
  return t >= now - days * 24 * 60 * 60 * 1000;
}

function fmtRangeLabel(range: TimeRange) {
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

export default function AdminOverview({
  clients,
  projects,
  points,
}: {
  clients: ClientRow[];
  projects: ApiProject[];
  points: OverviewReportPoint[];
}) {
  const theme = useTheme();
  const colors = THEME_COLORS[theme];
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tab, setTab] = useState<ChartTab>("projects");
  const [range, setRange] = useState<TimeRange>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const projectCountByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of clients) map.set(c.id, c.projectCount);
    if (projects.length) {
      map.clear();
      for (const c of clients) map.set(c.id, 0);
      for (const p of projects) {
        map.set(p.clientId, (map.get(p.clientId) ?? 0) + 1);
      }
    }
    return map;
  }, [clients, projects]);

  const rangedPoints = useMemo(
    () => points.filter((p) => p.clientId && inRange(p.generatedAt, range)),
    [points, range]
  );

  const statsByClient = useMemo(() => {
    const map = new Map<string, { scores: number[]; reports: number; passed: number }>();
    for (const p of rangedPoints) {
      const row = map.get(p.clientId) ?? { scores: [], reports: 0, passed: 0 };
      row.reports += 1;
      if (p.passed) row.passed += 1;
      if (typeof p.score === "number") row.scores.push(p.score);
      map.set(p.clientId, row);
    }
    return map;
  }, [rangedPoints]);

  const activeClients = clients.filter((c) => (c.status || "active").toLowerCase() !== "inactive").length;
  const totalProjects = [...projectCountByClient.values()].reduce((a, b) => a + b, 0);
  const scored = rangedPoints.filter((p) => typeof p.score === "number");
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((a, p) => a + (p.score ?? 0), 0) / scored.length)
      : 0;
  const passRate =
    rangedPoints.length > 0
      ? Math.round((rangedPoints.filter((p) => p.passed).length / rangedPoints.length) * 100)
      : Math.round((activeClients / Math.max(clients.length, 1)) * 100);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const count = projectCountByClient.get(c.id) ?? c.projectCount;
      if (statusFilter === "active") return (c.status || "active").toLowerCase() !== "inactive" && count > 0;
      if (statusFilter === "empty") return count === 0;
      return true;
    });
  }, [clients, projectCountByClient, statusFilter]);

  const chartRows = useMemo(() => {
    return filteredClients
      .map((c) => {
        const stats = statsByClient.get(c.id);
        const avg =
          stats && stats.scores.length
            ? Math.round(stats.scores.reduce((a, n) => a + n, 0) / stats.scores.length)
            : 0;
        return {
          clientId: c.id,
          name: c.name.length > 14 ? `${c.name.slice(0, 13)}…` : c.name,
          fullName: c.name,
          projects: projectCountByClient.get(c.id) ?? c.projectCount,
          score: avg,
          reports: stats?.reports ?? 0,
        };
      })
      .sort((a, b) => (tab === "scores" ? b.score - a.score : b.projects - a.projects))
      .slice(0, 12);
  }, [filteredClients, projectCountByClient, statsByClient, tab]);

  const ranking = useMemo(() => {
    return [...filteredClients]
      .map((c) => {
        const stats = statsByClient.get(c.id);
        const avg =
          stats && stats.scores.length
            ? Math.round(stats.scores.reduce((a, n) => a + n, 0) / stats.scores.length)
            : 0;
        return {
          ...c,
          projects: projectCountByClient.get(c.id) ?? c.projectCount,
          score: avg,
          reports: stats?.reports ?? 0,
        };
      })
      .sort((a, b) => (tab === "scores" ? b.score - a.score || b.reports - a.reports : b.projects - a.projects))
      .slice(0, 8);
  }, [filteredClients, projectCountByClient, statsByClient, tab]);

  const listClients = useMemo(() => {
    if (!selectedId) return filteredClients;
    const selected = filteredClients.find((c) => c.id === selectedId);
    if (!selected) return filteredClients;
    return [selected, ...filteredClients.filter((c) => c.id !== selectedId)];
  }, [filteredClients, selectedId]);

  function selectClient(id: string) {
    setSelectedId((cur) => (cur === id ? null : id));
    document.getElementById("client-directory")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-signal-pass mb-1">Operations</div>
          <h1 className="font-display text-3xl font-bold">Audit Console</h1>
          <p className="text-sm text-mist mt-1">
            Click a metric, bar, or ranking row to filter the client directory.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-xs text-mist font-mono">
            {clients.length} client{clients.length === 1 ? "" : "s"}
          </div>
          <CreateClientButton />
          <CreateUserButton clients={clients.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={<Building2 size={18} />}
          label="Clients"
          value={String(clients.length)}
          footer={`${activeClients} active`}
          active={statusFilter === "all"}
          onClick={() => {
            setStatusFilter("all");
            setSelectedId(null);
          }}
        />
        <KpiCard
          icon={<FolderKanban size={18} />}
          label="Projects"
          value={String(totalProjects)}
          footer={`${clients.filter((c) => (projectCountByClient.get(c.id) ?? 0) === 0).length} without projects`}
          active={statusFilter === "empty"}
          onClick={() => setStatusFilter((v) => (v === "empty" ? "all" : "empty"))}
        />
        <KpiCard
          icon={<Activity size={18} />}
          label="Reports in range"
          value={String(rangedPoints.length)}
          footer={scored.length ? `Avg score ${avgScore}` : "No scored reports yet"}
          active={tab === "scores"}
          onClick={() => setTab((v) => (v === "scores" ? "projects" : "scores"))}
        />
        <button
          type="button"
          onClick={() => setStatusFilter((v) => (v === "active" ? "all" : "active"))}
          className={`${cardClass} p-5 text-left hover:border-signal-pass/40 transition ${
            statusFilter === "active" ? "border-signal-pass/50 ring-1 ring-signal-pass/20" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-mist mb-2 flex items-center gap-2">
                <ShieldCheck size={18} />
                Audit effect
              </div>
              <div className="text-xs text-mist">
                {statusFilter === "active" ? "Showing active with work" : "Click to show active"}
              </div>
            </div>
            <CompactGauge value={passRate || avgScore} label={rangedPoints.length ? "Pass" : "Health"} />
          </div>
        </button>
      </div>

      <div className={`${cardClass} p-5 lg:p-6`}>
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
                onClick={() => setTab(id)}
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
                onClick={() => setRange(id)}
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
                    if (id) selectClient(id);
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
                      const row = payload?.[0]?.payload as (typeof chartRows)[number] | undefined;
                      if (!active || !row) return null;
                      return (
                        <div className="border border-line bg-panel2 rounded-xl px-2.5 py-1.5 text-[11px] font-mono shadow-xl">
                          <div className="text-chalk mb-0.5">{row.fullName}</div>
                          <div className="text-mist">{row.projects} projects</div>
                          <div className="text-mist">{row.reports} reports · score {row.score || "—"}</div>
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
                      onClick={() => selectClient(c.id)}
                      className={`w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                        selectedId === c.id
                          ? "bg-signal-pass/10 text-signal-pass"
                          : "hover:bg-panel2 hover:text-signal-pass text-chalk"
                      }`}
                    >
                      <span
                        className={`h-6 w-6 shrink-0 rounded-full text-[11px] font-mono flex items-center justify-center ${
                          i < 3 ? "bg-chalk text-panel dark:bg-signal-pass dark:text-onaccent" : "bg-panel2 text-mist border border-line"
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
                onClick={() => setSelectedId(null)}
                className="mt-3 text-[11px] font-mono text-mist hover:text-signal-pass"
              >
                Clear focus
              </button>
            )}
          </div>
        </div>
      </div>

      <div id="client-directory">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-xl font-semibold">Client directory</h2>
          <div className="flex items-center gap-2">
            {(
              [
                ["all", "All"],
                ["active", "Active"],
                ["empty", "No projects"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatusFilter(id)}
                className={`${chipClass} ${statusFilter === id ? chipActiveClass : chipIdleClass}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ClientListPanel clients={listClients} highlightId={selectedId} />
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  footer,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  footer: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cardClass} p-5 text-left hover:border-signal-pass/40 transition ${
        active ? "border-signal-pass/50 ring-1 ring-signal-pass/20" : ""
      }`}
    >
      <div className="text-xs uppercase tracking-widest text-mist mb-3 flex items-center gap-2">
        {icon}
        {label}
      </div>
      <div className="font-display text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-mist mt-3 border-t border-line pt-3">{footer}</div>
    </button>
  );
}

function CompactGauge({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  const c = THEME_COLORS[theme];
  const size = 72;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const dash = circumference * pct;
  const color = value >= 80 ? c.pass : value >= 60 ? c.warn : c.fail;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.line} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-bold tabular-nums" style={{ color }}>
          {Math.round(value)}%
        </span>
        <span className="text-[9px] uppercase tracking-wider text-mist">{label}</span>
      </div>
    </div>
  );
}
