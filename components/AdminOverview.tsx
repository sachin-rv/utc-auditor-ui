"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Building2, FolderKanban, Activity } from "lucide-react";
import ClientListPanel, { type ClientRow } from "@/components/ClientListPanel";
import CreateClientButton from "@/components/CreateClientButton";
import CreateUserButton from "@/components/CreateUserButton";
import { cardClass, chipActiveClass, chipClass, chipIdleClass } from "@/lib/ui";
import type { OverviewReportPoint } from "@/lib/load-admin-overview";
import type { ApiProject } from "@/lib/api-types";
import type { OverviewChartTab, OverviewTimeRange } from "@/components/AdminOverviewCharts";

const AdminOverviewCharts = dynamic(() => import("@/components/AdminOverviewCharts"), {
  ssr: false,
  loading: () => (
    <div id="admin-charts" className={`${cardClass} p-5 lg:p-6 min-h-[360px] flex items-center justify-center text-sm text-mist`}>
      Loading charts…
    </div>
  ),
});

type StatusFilter = "all" | "active" | "empty";

function inRange(iso: string, range: OverviewTimeRange) {
  if (range === "all") return true;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  const now = Date.now();
  const days = range === "week" ? 7 : range === "month" ? 30 : 365;
  return t >= now - days * 24 * 60 * 60 * 1000;
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tab, setTab] = useState<OverviewChartTab>("projects");
  const [range, setRange] = useState<OverviewTimeRange>("all");
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
    <div id="admin-overview" className="space-y-6">
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

      <div id="admin-kpis" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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

      <AdminOverviewCharts
        chartRows={chartRows}
        ranking={ranking}
        tab={tab}
        range={range}
        selectedId={selectedId}
        onTab={setTab}
        onRange={setRange}
        onSelect={selectClient}
        onClear={() => setSelectedId(null)}
      />
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
