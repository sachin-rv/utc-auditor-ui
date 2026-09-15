"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import ProjectCard from "@/components/ProjectCard";
import type { ReportRow } from "@/components/ReportHistoryList";
import type { ApiProject } from "@/lib/api-types";
import { listContainer, listItem } from "@/components/PageEnter";
import { chipActiveClass, chipClass, chipIdleClass, emptyStateClass, fieldCompactClass } from "@/lib/ui";

export interface ProjectBoardItem {
  project: ApiProject;
  reports: ReportRow[];
  total: number;
}

type StatusFilter = "all" | "passing" | "failing" | "empty";

function latestStatus(item: ProjectBoardItem) {
  return item.reports[0]?.status;
}

export default function ProjectsBoard({
  clientId,
  isAdmin,
  items,
}: {
  clientId: string;
  isAdmin: boolean;
  items: ProjectBoardItem[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [expandAll, setExpandAll] = useState(true);
  const reduced = useReducedMotion();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const p = item.project;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.repositoryUrl ?? "").toLowerCase().includes(q) ||
        (p.websiteUrl ?? "").toLowerCase().includes(q) ||
        (p.auditConfig ?? []).some(
          (cfg) =>
            cfg.branch.toLowerCase().includes(q) ||
            cfg.envType.toLowerCase().includes(q),
        );
      if (!matchesQuery) return false;
      const s = latestStatus(item);
      if (status === "empty") return item.reports.length === 0;
      if (status === "passing") return s === "success" || s === "pass";
      if (status === "failing") return s === "failed" || s === "fail";
      return true;
    });
  }, [items, query, status]);

  const chips: { id: StatusFilter; label: string }[] = [
    { id: "all", label: `All · ${items.length}` },
    { id: "passing", label: "Passing" },
    { id: "failing", label: "Failing" },
    { id: "empty", label: "No reports" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[14rem]">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mist"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, slugs, repos…"
            className={`${fieldCompactClass} pl-10`}
          />
        </div>
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setStatus(c.id)}
            className={`${chipClass} ${status === c.id ? chipActiveClass : chipIdleClass}`}
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setExpandAll((v) => !v)}
          className="text-[11px] font-mono text-mist hover:text-chalk ml-auto rounded-full px-3 py-1.5 hover:bg-panel2 transition"
        >
          {expandAll ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className={emptyStateClass}>
          {items.length === 0 ? "No projects yet." : "No projects match the current filters."}
        </div>
      ) : (
        <motion.div
          className="space-y-6"
          variants={reduced ? undefined : listContainer}
          initial={reduced ? false : "hidden"}
          animate="show"
        >
          {filtered.map((item) => (
            <motion.div key={`${item.project.id}-${expandAll ? "open" : "shut"}`} variants={reduced ? undefined : listItem}>
              <ProjectCard
                clientId={clientId}
                project={item.project}
                isAdmin={isAdmin}
                reports={item.reports}
                total={item.total}
                defaultOpen={expandAll}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
