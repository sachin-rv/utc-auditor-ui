"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScoreDial from "@/components/ScoreDial";
import CoverageBars from "@/components/CoverageBars";
import FindingsPanel from "@/components/FindingsPanel";
import CopyLinkButton from "@/components/CopyLinkButton";
import CopyTextButton from "@/components/CopyTextButton";
import StatusPill from "@/components/StatusPill";
import PageLoader from "@/components/PageLoader";
import type { CoverageMetrics, Finding } from "@/lib/types";
import type { ReportPipeline } from "@/lib/api-types";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import PageEnter, { listContainer, listItem } from "@/components/PageEnter";
import { cardClass, cardInteractiveClass, chipActiveClass, chipClass, chipIdleClass } from "@/lib/ui";
import { clientProjectPath, clientReportDetailsPath } from "@/lib/client-routes";

export interface ReportViewModel {
  id: string;
  reportId: string;
  clientId: string;
  projectId?: string;
  timestamp: string;
  overallScore: number;
  coverage: CoverageMetrics;
  testExecution: { total: number; passed: number; failed: number };
  findings: Finding[];
  status: string;
  pipeline?: ReportPipeline;
  hasDetailed: boolean;
  rawJson: Record<string, unknown>;
}

type Tab = "overview" | "findings" | "payload";

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

function scoreLabel(score: number) {
  if (score < 60) return "Critical";
  if (score < 80) return "Needs work";
  if (score < 90) return "Good";
  return "Strong";
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
  const [pipelineOpen, setPipelineOpen] = useState(true);
  const [jsonText, setJsonText] = useState<string | null>(null);

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
        if (cancelled) return;
        if (tab === "payload") {
          setJsonText((cur) => cur ?? JSON.stringify(view.rawJson, null, 2));
        }
        setTabReady(true);
      }, 280);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [tab, view.rawJson]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "findings", label: `Findings (${view.findings.length})` },
    { id: "payload", label: "Report JSON" },
  ];

  const passRate =
    view.testExecution.total > 0
      ? Math.round((view.testExecution.passed / view.testExecution.total) * 100)
      : 0;
  const reduced = useReducedMotion();

  return (
    <PageEnter>
    <div>
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
            <StatusPill status={view.status} />
          </div>
          <div className="text-sm text-mist mt-1">{fmtDateTime(view.timestamp)}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            goToTab("overview");
            requestAnimationFrame(() => {
              document.getElementById("overview-metrics")?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }}
          className={`text-right rounded-2xl border px-4 py-2.5 min-w-[9.5rem] shadow-xl shadow-black/5 dark:shadow-black/40 hover:brightness-105 transition ${scoreBadgeClass(view.overallScore)}`}
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-mist">Overall score</div>
          <div className={`font-display text-4xl font-bold tabular-nums leading-none mt-1 ${scoreColor(view.overallScore)}`}>
            {view.overallScore}
            <span className="text-base font-medium text-mist"> /100</span>
          </div>
          <div className={`text-[11px] font-medium mt-1 ${scoreColor(view.overallScore)}`}>{scoreLabel(view.overallScore)}</div>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-line pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => goToTab(t.id)}
            className={`${chipClass} ${
              tab === t.id ? chipActiveClass : chipIdleClass
            }`}
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
          >
          <motion.div
            id="overview-metrics"
            className="grid md:grid-cols-[auto_1fr] gap-6 mb-6"
            variants={reduced ? undefined : listContainer}
            initial={reduced ? false : "hidden"}
            animate="show"
          >
            {view.hasDetailed ? (
              <motion.div variants={reduced ? undefined : listItem} whileHover={reduced ? undefined : { y: -2 }}>
                <Link
                  href={clientReportDetailsPath(view.clientId, view.id)}
                  className={`${cardInteractiveClass} p-6 flex flex-col items-center justify-center gap-2 h-full`}
                >
                  <ScoreDial score={view.overallScore} size={172} />
                  <span className="text-[11px] text-signal-pass">Open detailed breakdown →</span>
                </Link>
              </motion.div>
            ) : (
              <motion.div variants={reduced ? undefined : listItem} className={`${cardClass} p-6 flex flex-col items-center justify-center gap-2`}>
                <ScoreDial score={view.overallScore} size={172} />
              </motion.div>
            )}
            <motion.div className="grid sm:grid-cols-2 gap-6" variants={reduced ? undefined : listItem}>
              <motion.button
                type="button"
                variants={reduced ? undefined : listItem}
                whileHover={reduced ? undefined : { y: -2 }}
                onClick={() => goToTab("findings")}
                className={`text-left ${cardInteractiveClass} p-6`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase tracking-widest text-mist">Coverage</div>
                  <span className="text-[11px] text-signal-pass">Findings →</span>
                </div>
                <CoverageBars coverage={view.coverage} />
              </motion.button>
              <motion.button
                type="button"
                variants={reduced ? undefined : listItem}
                whileHover={reduced ? undefined : { y: -2 }}
                onClick={() => goToTab("findings")}
                className={`text-left ${cardInteractiveClass} p-6`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase tracking-widest text-mist">Test execution</div>
                  <span className="text-[11px] font-mono text-mist">{passRate}% pass rate</span>
                </div>
                <div className="grid grid-cols-2 gap-y-3 text-sm font-mono">
                  <span className="text-mist">Total</span>
                  <span className="text-right">{view.testExecution.total.toLocaleString()}</span>
                  <span className="text-signal-pass">Passed</span>
                  <span className="text-right text-signal-pass">{view.testExecution.passed.toLocaleString()}</span>
                  <span className="text-signal-fail">Failed</span>
                  <span className="text-right text-signal-fail">{view.testExecution.failed.toLocaleString()}</span>
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-panel2 overflow-hidden">
                  <motion.div
                    className="h-full bg-signal-pass"
                    initial={reduced ? false : { width: 0 }}
                    animate={{ width: `${Math.min(100, passRate)}%` }}
                    transition={{ duration: reduced ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <div className="text-[11px] text-signal-pass mt-3">View findings →</div>
              </motion.button>
            </motion.div>
          </motion.div>

          {view.hasDetailed && (
            <Link
              href={clientReportDetailsPath(view.clientId, view.id)}
              className={`group mb-6 flex items-center justify-between ${cardInteractiveClass} px-5 py-3.5`}
            >
              <div>
                <div className="text-sm font-medium">Detailed test-quality breakdown</div>
                <div className="text-xs text-mist mt-0.5">Per-file coverage, quality findings, and sub-scores</div>
              </div>
              <span className="text-mist group-hover:text-signal-pass group-hover:translate-x-0.5 transition-all">→</span>
            </Link>
          )}

          <div className={`w-full ${cardClass} overflow-hidden`}>
            <button
              type="button"
              onClick={() => setPipelineOpen((v) => !v)}
              className="w-full px-5 py-3.5 text-left hover:bg-panel2/40 transition-colors flex items-center justify-between"
            >
              <span className="text-xs uppercase tracking-widest text-mist">Run metadata</span>
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
              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-xs font-mono px-5 pb-4">
                <MetaRow label="Report id" value={view.reportId} />
                <MetaRow label="Mongo id" value={view.id} />
                <MetaRow label="Branch" value={view.pipeline?.branch ?? "—"} />
                <MetaRow label="Provider" value={view.pipeline?.provider ?? "—"} />
                <MetaRow label="Trigger" value={view.pipeline?.triggeredBy ?? "—"} />
                <MetaRow label="Commit" value={view.pipeline?.commitSha ?? "—"} />
                <MetaRow label="Run id" value={view.pipeline?.runId ?? "—"} />
              </dl>
            )}
          </div>
          </motion.div>
        )}

        {tab === "findings" && (
          <motion.section
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

        {tab === "payload" && (
          <motion.section
            key="payload"
            className={!tabReady ? undefined : `${cardClass} overflow-hidden`}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
          >
            {!tabReady || jsonText == null ? (
              <PageLoader label="Loading report JSON…" />
            ) : (
              <>
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-line bg-panel2/40">
                  <span className="text-xs uppercase tracking-widest text-mist">reportJson</span>
                  <CopyTextButton value={jsonText} label="Copy JSON" />
                </div>
                <pre className="px-5 py-4 text-[11px] font-mono text-mist overflow-x-auto max-h-[32rem] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {jsonText}
                </pre>
              </>
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
