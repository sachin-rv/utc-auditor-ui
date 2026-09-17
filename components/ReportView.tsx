"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CoverageBars from "@/components/CoverageBars";
import FindingsPanel from "@/components/FindingsPanel";
import CopyLinkButton from "@/components/CopyLinkButton";
import CopyTextButton from "@/components/CopyTextButton";
import JsonTree from "@/components/JsonTree";
import StatusPill from "@/components/StatusPill";
import PageLoader from "@/components/PageLoader";
import type { ReportRow } from "@/components/ReportHistoryList";
import ScoreChangeCard from "@/components/ScoreChangeCard";
import type { CoverageMetrics, Finding } from "@/lib/types";
import type { ReportPipeline } from "@/lib/api-types";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import PageEnter, { listContainer, listItem } from "@/components/PageEnter";
import { cardClass, cardInteractiveClass, chipActiveClass, chipClass, chipIdleClass } from "@/lib/ui";
import { clientProjectPath, clientReportDetailsPath } from "@/lib/client-routes";
import { averageScore, gradeLabel } from "@/lib/display-score";
import { explainScoreChange, snapshotFromRow } from "@/lib/score-change";

export interface ReportTopRisk {
  title: string;
  detail: string;
  count: number;
}

export interface ReportViewModel {
  id: string;
  reportId: string;
  clientId: string;
  projectId?: string;
  timestamp: string;
  overallScore: number;
  grade: string;
  cmsCoverage: number;
  cmsReadiness: number;
  coverage: CoverageMetrics;
  testExecution: { total: number; passed: number; failed: number };
  findings: Finding[];
  topRisks: ReportTopRisk[];
  status: string;
  pipeline?: ReportPipeline;
  hasDetailed: boolean;
  rawJson: Record<string, unknown>;
  history: ReportRow[];
}

type Tab = "overview" | "findings";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function scoreTone(score: number) {
  if (score < 60) return "fail" as const;
  if (score < 80) return "warn" as const;
  if (score < 90) return "info" as const;
  return "pass" as const;
}

function scoreColor(score: number) {
  const t = scoreTone(score);
  if (t === "fail") return "text-signal-fail";
  if (t === "warn") return "text-signal-warn";
  if (t === "info") return "text-signal-info";
  return "text-signal-pass";
}

function scoreBadgeClass(score: number) {
  const t = scoreTone(score);
  if (t === "fail") return "bg-signal-fail/10 border-signal-fail/30";
  if (t === "warn") return "bg-signal-warn/10 border-signal-warn/30";
  if (t === "info") return "bg-signal-info/10 border-signal-info/30";
  return "bg-signal-pass/10 border-signal-pass/30";
}

export default function ReportView({
  projectName,
  view,
}: {
  projectName: string;
  view: ReportViewModel;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [tabReady, setTabReady] = useState(true);
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [jsonText, setJsonText] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const qualityScore = Math.max(1, Math.round(view.overallScore));
  const grade = view.grade || "C";

  const history = useMemo(() => {
    const rows = [...view.history];
    if (!rows.some((r) => r.id === view.id)) {
      rows.unshift({
        id: view.id,
        timestamp: view.timestamp,
        trigger: view.pipeline?.triggeredBy ?? view.pipeline?.provider ?? "pipeline",
        overallScore: qualityScore,
        passed: view.testExecution.passed,
        total: view.testExecution.total,
        failed: view.testExecution.failed,
        coverage: view.coverage,
        coveragePercent: view.coverage.lines,
        status: view.status,
        qualityGrade: grade,
        completenessScore: view.cmsCoverage,
        cmsReadiness: view.cmsReadiness,
        findingsCount: view.findings.length,
      });
    }
    return rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [view, qualityScore, grade]);

  const avgScore = averageScore(history.map((r) => r.overallScore));
  const previous = useMemo(() => {
    const idx = history.findIndex((r) => r.id === view.id);
    return idx >= 0 ? history[idx + 1] : history[1];
  }, [history, view.id]);
  const scoreChange = useMemo(() => {
    if (!previous) return null;
    const currentRow = history.find((r) => r.id === view.id) ?? history[0];
    if (!currentRow) return null;
    return explainScoreChange(snapshotFromRow(currentRow), snapshotFromRow(previous));
  }, [history, previous, view.id]);

  function goToTab(next: Tab) {
    if (next === tab) return;
    setTab(next);
    if (next === "overview") {
      setTabReady(true);
      return;
    }
    setTabReady(false);
  }

  useEffect(() => {
    if (tab === "overview") return;
    let cancelled = false;
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        if (!cancelled) setTabReady(true);
      }, 220);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "findings", label: `Findings (${view.findings.length})` },
  ];

  const summaryCards = [
    { label: "Total tests", value: view.testExecution.total.toLocaleString(), tone: "text-chalk" },
    { label: "Passed tests", value: view.testExecution.passed.toLocaleString(), tone: "text-signal-pass" },
    { label: "Failed tests", value: view.testExecution.failed.toLocaleString(), tone: view.testExecution.failed ? "text-signal-fail" : "text-chalk" },
  ];

  const indicators = [
    { label: "CMS Coverage", value: `${Math.max(1, view.cmsCoverage)}%`, tone: scoreColor(view.cmsCoverage) },
    { label: "CMS Readiness", value: `${Math.max(1, view.cmsReadiness)}%`, tone: scoreColor(view.cmsReadiness) },
    { label: "Findings", value: view.findings.length.toLocaleString(), tone: view.findings.length ? "text-signal-warn" : "text-signal-pass" },
  ];

  return (
    <PageEnter>
    <div id="report-view">
      <Link
        href={
          view.projectId
            ? clientProjectPath(view.clientId, view.projectId)
            : `/dashboard/client/${view.clientId}`
        }
        className="text-xs text-mist hover:text-chalk font-mono mb-4 inline-block hover:translate-x-[-2px] transition-transform"
      >
        ← Project history
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-signal-pass mb-1">Audit report</div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold">{projectName}</h1>
            <CopyLinkButton />
          </div>
          <div className="text-sm text-mist mt-1">{fmtDateTime(view.timestamp)}</div>
          {history.length > 0 && (
            <div className="text-sm mt-1">
              Average quality across {history.length} run{history.length === 1 ? "" : "s"}:{" "}
              <span className={`font-semibold ${scoreColor(avgScore)}`}>{avgScore}</span>
            </div>
          )}
        </div>
        <div className={`text-right rounded-2xl border px-4 py-2.5 min-w-[9.5rem] shadow-xl shadow-black/5 dark:shadow-black/40 ${scoreBadgeClass(qualityScore)}`}>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-mist">Quality score</div>
          <div className={`font-display text-4xl font-bold tabular-nums leading-none mt-1 ${scoreColor(qualityScore)}`}>
            {qualityScore}
            <span className="text-base font-medium text-mist"> /100</span>
          </div>
          <div className={`text-[11px] font-medium mt-1 ${scoreColor(qualityScore)}`}>
            Grade {grade} · {gradeLabel(grade)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-line pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => goToTab(t.id)}
            className={`${chipClass} ${tab === t.id ? chipActiveClass : chipIdleClass}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "overview" && (
          <motion.div
            key="overview"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className="space-y-3"
            id="report-overview"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
              <section id="report-summary">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-mist mb-1.5">Summary</div>
                <motion.div
                  className="grid grid-cols-3 gap-2"
                  variants={reduced ? undefined : listContainer}
                  initial={reduced ? false : "hidden"}
                  animate="show"
                >
                  {summaryCards.map((card) => (
                    <motion.div
                      key={card.label}
                      variants={reduced ? undefined : listItem}
                      className={`${cardClass} flex items-center justify-between gap-3 px-3 py-2.5`}
                    >
                      <div className="text-[10px] uppercase tracking-widest text-mist leading-none">{card.label}</div>
                      <div className={`font-display text-xl font-bold tabular-nums leading-none shrink-0 ${card.tone}`}>{card.value}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </section>

              <section id="report-health">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-mist mb-1.5">Health indicators</div>
                <motion.div
                  className="grid grid-cols-3 gap-2"
                  variants={reduced ? undefined : listContainer}
                  initial={reduced ? false : "hidden"}
                  animate="show"
                >
                  {indicators.map((card) => (
                    <motion.div
                      key={card.label}
                      variants={reduced ? undefined : listItem}
                      className={`${cardClass} flex items-center justify-between gap-3 px-3 py-2.5`}
                    >
                      <div className="text-[10px] uppercase tracking-widest text-mist leading-none">{card.label}</div>
                      <div className={`font-display text-xl font-bold tabular-nums leading-none shrink-0 ${card.tone}`}>{card.value}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            </div>

            <div id="report-coverage" className={`${cardClass} px-4 py-3`}>
              <div className="text-[10px] uppercase tracking-widest text-mist mb-2">Coverage snapshot</div>
              <CoverageBars coverage={view.coverage} compact />
            </div>

            {scoreChange && <ScoreChangeCard change={scoreChange} />}

            {view.hasDetailed && (
              <Link
                href={clientReportDetailsPath(view.clientId, view.id)}
                className={`group flex items-center justify-between ${cardInteractiveClass} px-4 py-2.5`}
              >
                <div>
                  <div className="text-sm font-medium">Detailed quality breakdown</div>
                  <div className="text-xs text-mist mt-0.5">Coverage by area, findings, and recommended next steps</div>
                </div>
                <span className="text-mist group-hover:text-signal-pass group-hover:translate-x-0.5 transition-all">→</span>
              </Link>
            )}

            <div id="report-run-details" className={`w-full ${cardClass} overflow-hidden`}>
              <button
                type="button"
                onClick={() => {
                  setPipelineOpen((v) => !v);
                  if (!jsonText) setJsonText(JSON.stringify(view.rawJson, null, 2));
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-panel2/40 transition-colors flex items-center justify-between"
              >
                <span className="text-xs uppercase tracking-widest text-mist">Run details</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={`text-mist transition-transform ${pipelineOpen ? "" : "-rotate-90"}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {pipelineOpen && (
                <div className="px-5 pb-4 space-y-3">
                  <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                    <MetaRow label="When" value={fmtDateTime(view.timestamp)} />
                    <MetaRow label="Branch" value={view.pipeline?.branch ?? "—"} />
                    <MetaRow label="Started by" value={view.pipeline?.triggeredBy ?? "—"} />
                    <MetaRow label="Source" value={view.pipeline?.provider ?? "—"} />
                  </dl>
                  <div className="border border-line rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-line bg-panel2/40">
                        <span className="text-[11px] text-mist">Raw report (support use)</span>
                        <CopyTextButton
                          value={jsonText ?? JSON.stringify(view.rawJson, null, 2)}
                          label="Copy"
                        />
                      </div>
                      <JsonTree value={view.rawJson} />
                    </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === "findings" && (
          <motion.section
            id="report-findings"
            key="findings"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
          >
            {!tabReady ? (
              <PageLoader label="Loading findings…" />
            ) : (
              <FindingsPanel findings={view.findings} />
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
    </PageEnter>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 min-w-0">
      <dt className="text-mist shrink-0">{label}</dt>
      <dd className="text-chalk truncate">{value}</dd>
    </div>
  );
}
