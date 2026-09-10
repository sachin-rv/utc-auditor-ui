"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import StatusPill from "@/components/StatusPill";
import { cardClass } from "@/lib/ui";
import ScoreDial from "@/components/ScoreDial";
import CoverageBars from "@/components/CoverageBars";
import TrendChart from "@/components/TrendChart";
import ReportHistoryList, { ReportRow } from "@/components/ReportHistoryList";
import CreateApiKeyButton from "@/components/CreateApiKeyButton";
import CopyTextButton from "@/components/CopyTextButton";
import EditProjectButton from "@/components/EditProjectButton";
import type { ApiProject } from "@/lib/api-types";
import { clientProjectPath } from "@/lib/client-routes";

export default function ProjectCard({
  clientId,
  project,
  isAdmin,
  reports,
  total,
  defaultOpen = true,
}: {
  clientId: string;
  project: ApiProject;
  isAdmin: boolean;
  reports: ReportRow[];
  total: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const latest = reports[0];
  const coverage = latest?.coverage ?? {
    statements: Math.round(latest?.coveragePercent ?? 0),
    branches: Math.round(latest?.coveragePercent ?? 0),
    functions: Math.round(latest?.coveragePercent ?? 0),
    lines: Math.round(latest?.coveragePercent ?? 0),
  };
  const passRate =
    latest && latest.total > 0 ? Math.round((latest.passed / latest.total) * 100) : 0;
  const reduced = useReducedMotion();

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-panel2/40 gap-4">
        <div className="text-left min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={clientProjectPath(clientId, project.id)}
              className="font-display font-bold text-lg hover:text-signal-pass transition-colors"
            >
              {project.name}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="group"
              aria-expanded={open}
              aria-label={open ? "Collapse project" : "Expand project"}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`text-mist transition-transform ${open ? "" : "-rotate-90"}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <span className="text-[10px] font-mono uppercase tracking-wider text-mist border border-line rounded-full px-2 py-0.5">
              {project.slug}
            </span>
            {project.auditConfig?.[0]?.schedule && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-mist border border-line rounded-full px-2 py-0.5">
                {project.auditConfig[0].schedule}
              </span>
            )}
          </div>
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs text-mist font-mono mt-0.5 truncate max-w-full text-left">
            {project.repositoryUrl ?? "No repository URL"}
            {project.branch ? ` · ${project.branch}` : ""}
          </button>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {latest && <StatusPill status={latest.status ?? "no_reports"} />}
          {project.repositoryUrl && <CopyTextButton value={project.repositoryUrl} label="Repo" />}
          {isAdmin && <CreateApiKeyButton projectId={project.id} projectName={project.name} />}
          {isAdmin && <EditProjectButton clientId={clientId} project={project} />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {project.description && (
              <div className="px-6 py-3 border-b border-line text-sm text-mist">{project.description}</div>
            )}
            {reports.length === 0 ? (
              <div className="px-8 py-16 text-center text-mist text-sm">No audit reports submitted for this project yet.</div>
            ) : (
              <>
                <div className="grid lg:grid-cols-[auto_minmax(12rem,0.9fr)_minmax(16rem,1.35fr)] gap-8 px-6 py-6 border-b border-line">
                  <ScoreDial
                    score={latest?.overallScore ?? 0}
                    label={latest?.qualityGrade ? `Grade ${latest.qualityGrade}` : "Quality score"}
                  />
                  <div>
                    <div className="text-xs uppercase tracking-widest text-mist mb-3">Latest coverage</div>
                    <CoverageBars coverage={coverage} />
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-line text-mist">
                        {latest?.passed ?? 0}/{latest?.total ?? 0} tests · {passRate}% pass
                      </span>
                      {latest?.failed ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-signal-fail/40 text-signal-fail">
                          {latest.failed} failed
                        </span>
                      ) : null}
                      {latest?.findingsCount ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-signal-warn/40 text-signal-warn">
                          {latest.findingsCount} findings
                        </span>
                      ) : null}
                      {latest?.completenessScore != null ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-line text-mist">
                          Completeness {latest.completenessScore}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <TrendChart
                    points={reports.map((r) => ({
                      timestamp: r.timestamp,
                      score: r.overallScore,
                      coverage: r.coverage?.lines ?? r.coveragePercent ?? 0,
                    }))}
                  />
                </div>
                <div className="px-6 py-4">
                  <div className="text-xs uppercase tracking-widest text-mist mb-3">
                    Report history ({total})
                  </div>
                  <ReportHistoryList clientId={clientId} reports={reports} />
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
