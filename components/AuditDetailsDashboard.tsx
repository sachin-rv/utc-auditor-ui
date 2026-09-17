"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type {
  CompletenessRec,
  CoverageFileRow,
  FailedCase,
  QualityStrategy,
  StaticIssue,
  TestCaseRow,
  TestFileResult,
  Tone,
  UserReportView,
} from "@/lib/user-report";
import { countTone, gradeTone, scoreTone } from "@/lib/user-report";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { btnGhostClass, chipClass, chipIdleClass, fieldCompactClass, fieldInlineClass } from "@/lib/ui";
import { listContainer, listItem } from "@/components/PageEnter";
import Modal from "@/components/Modal";
import CopyTextButton from "@/components/CopyTextButton";
import CoverageBars from "@/components/CoverageBars";
import InfoTip from "@/components/InfoTip";
import { HERO_NOTES, METRIC_HELP, METRIC_MODAL } from "@/lib/report-help";

type SectionId = "static" | "failed" | "files" | "cms" | "missing" | "coverage";

const TONE_BORDER: Record<Tone, string> = {
  pass: "border-signal-pass/40",
  warn: "border-signal-warn/45",
  fail: "border-signal-fail/40",
  neutral: "border-line",
};

const TONE_TEXT: Record<Tone, string> = {
  pass: "text-signal-pass",
  warn: "text-signal-warn",
  fail: "text-signal-fail",
  neutral: "text-chalk",
};

const TONE_BG: Record<Tone, string> = {
  pass: "bg-signal-pass/10 text-signal-pass",
  warn: "bg-signal-warn/15 text-signal-warn",
  fail: "bg-signal-fail/10 text-signal-fail",
  neutral: "bg-panel2 text-mist",
};

const PAGE_SIZE = 8;
const COVERAGE_PAGE = 10;

type Detail =
  | { type: "issue"; issue: StaticIssue }
  | { type: "strategy"; strategy: QualityStrategy }
  | { type: "failed"; item: FailedCase }
  | { type: "file"; file: TestFileResult }
  | { type: "coverage"; file: CoverageFileRow }
  | { type: "rec"; rec: CompletenessRec }
  | { type: "hero"; key: "quality" | "cms" | "completeness" }
  | { type: "tests"; title: string; sub: string; status: string }
  | { type: "issues-filter"; title: string; sub: string; severity: string }
  | { type: "failed-list" };

export default function AuditDetailsDashboard({ data }: { data: UserReportView }) {
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    static: false,
    failed: false,
    files: false,
    cms: false,
    missing: false,
    coverage: false,
  });
  const [detail, setDetail] = useState<Detail | null>(null);
  const [strategyFilter, setStrategyFilter] = useState<string | null>(null);

  const staticRef = useRef<HTMLDivElement>(null);
  const failedRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<HTMLDivElement>(null);
  const cmsRef = useRef<HTMLDivElement>(null);
  const missingRef = useRef<HTMLDivElement>(null);
  const coverageRef = useRef<HTMLDivElement>(null);
  const refs: Record<SectionId, RefObject<HTMLDivElement>> = {
    static: staticRef,
    failed: failedRef,
    files: filesRef,
    cms: cmsRef,
    missing: missingRef,
    coverage: coverageRef,
  };

  const staticCounts = useMemo(() => {
    const error = data.staticIssues.filter((i) => i.severity === "error").length;
    const warning = data.staticIssues.filter((i) => i.severity === "warning").length;
    const info = data.staticIssues.filter((i) => i.severity === "info").length;
    return { error, warning, info };
  }, [data.staticIssues]);

  function go(id: SectionId) {
    setOpen((prev) => ({ ...prev, [id]: true }));
    requestAnimationFrame(() => {
      refs[id].current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function toggle(id: SectionId) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function openStrategy(s: QualityStrategy) {
    setStrategyFilter(s.strategy);
    setDetail({ type: "strategy", strategy: s });
  }

  function openMetric(label: string, section: SectionId) {
    const cfg = METRIC_MODAL[label];
    if (cfg?.kind === "tests") {
      setDetail({ type: "tests", title: cfg.title, sub: cfg.sub, status: cfg.status ?? "all" });
      return;
    }
    if (cfg?.kind === "failed") {
      setDetail({ type: "failed-list" });
      return;
    }
    if (cfg?.kind === "issues") {
      setDetail({
        type: "issues-filter",
        title: cfg.title,
        sub: cfg.sub,
        severity: cfg.severity ?? "all",
      });
      return;
    }
    if (cfg?.kind === "hero" && cfg.hero) {
      setDetail({ type: "hero", key: cfg.hero });
      return;
    }
    go(section);
  }

  function expandAll() {
    setOpen({ static: true, failed: true, files: true, cms: true, missing: true, coverage: true });
  }

  function collapseAll() {
    setOpen({ static: false, failed: false, files: false, cms: false, missing: false, coverage: false });
  }

  const cmsTotal = data.cms.stats.legacyIssues + data.cms.stats.gapIssues + data.cms.stats.progressSignals;
  const failedFiles = new Set(data.run.failedCases.map((c) => c.file)).size;
  const strategyErrors = data.quality.byStrategy.reduce((n, s) => n + s.errors, 0);
  const strategyWarnings = data.quality.byStrategy.reduce((n, s) => n + s.warnings, 0);
  const strategyTitles = Object.fromEntries(data.quality.byStrategy.map((s) => [s.strategy, s.title]));
  const reduced = useReducedMotion();
  const metrics: {
    label: string;
    value: number;
    tone: Tone;
    section: SectionId;
    clickable: boolean;
  }[] = [
    { label: "Quality score", value: data.quality.score, tone: scoreTone(data.quality.score), section: "static", clickable: true },
    { label: "CMS readiness", value: data.cms.score, tone: scoreTone(data.cms.score), section: "cms", clickable: true },
    { label: "Test completeness", value: data.completeness.score, tone: scoreTone(data.completeness.score), section: "missing", clickable: true },
    { label: "Total tests", value: data.run.total, tone: "neutral", section: "files", clickable: true },
    { label: "Passed", value: data.run.passed, tone: "pass", section: "files", clickable: true },
    { label: "Failed", value: data.run.failed, tone: countTone(data.run.failed), section: "failed", clickable: true },
    { label: "Pending", value: data.run.pending, tone: countTone(data.run.pending), section: "failed", clickable: true },
    { label: "Todo", value: data.run.todo, tone: countTone(data.run.todo), section: "failed", clickable: true },
    { label: "Static errors", value: staticCounts.error, tone: countTone(staticCounts.error), section: "static", clickable: true },
    { label: "Static warnings", value: staticCounts.warning, tone: countTone(staticCounts.warning), section: "static", clickable: true },
    { label: "Static info", value: staticCounts.info, tone: countTone(staticCounts.info), section: "static", clickable: true },
    { label: "Legacy refs", value: data.cms.stats.filesWithLegacyRefs, tone: countTone(data.cms.stats.filesWithLegacyRefs), section: "cms", clickable: true },
    { label: "Untested", value: data.completeness.stats.untested, tone: countTone(data.completeness.stats.untested), section: "missing", clickable: true },
    { label: "High-risk gaps", value: data.completeness.stats.highPriority, tone: countTone(data.completeness.stats.highPriority), section: "missing", clickable: true },
  ];

  const strategyIssues = detail?.type === "strategy"
    ? data.staticIssues.filter((i) => i.strategy === detail.strategy.strategy)
    : [];

  return (
    <div id="audit-details-dashboard" className="space-y-4">
      <motion.div
        id="audit-metrics"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3"
        variants={reduced ? undefined : listContainer}
        initial={reduced ? false : "hidden"}
        animate="show"
      >
        {metrics.map((m) => (
          <motion.button
            key={m.label}
            id={`audit-metric-${m.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            type="button"
            onClick={() => (m.clickable ? openMetric(m.label, m.section) : go(m.section))}
            variants={reduced ? undefined : listItem}
            whileHover={reduced ? undefined : { y: -3 }}
            whileTap={reduced ? undefined : { scale: 0.98 }}
            className={`text-left border ${TONE_BORDER[m.tone]} bg-panel rounded-2xl p-3 shadow-xl shadow-black/5 dark:shadow-black/40 hover:border-signal-pass/40 transition`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="text-[10px] uppercase tracking-widest text-mist leading-tight">{m.label}</div>
              <InfoTip label={m.label} text={METRIC_HELP[m.label] ?? ""} />
            </div>
            <div className={`font-display text-2xl font-bold ${TONE_TEXT[m.tone]}`}>
              <AnimatedNumber value={m.value} />
            </div>
            <div className="text-[11px] text-mist mt-2">{m.clickable ? "View details →" : "Jump to section →"}</div>
          </motion.button>
        ))}
      </motion.div>

      {data.quality.byStrategy.length > 0 && (
        <div id="audit-strategies" className="pt-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-mist mb-3">
            Strategies deck · {data.quality.byStrategy.length} checks · {strategyErrors} errors · {strategyWarnings}{" "}
            warnings
          </div>
          <motion.div
            className="grid sm:grid-cols-2 gap-3"
            variants={reduced ? undefined : listContainer}
            initial={reduced ? false : "hidden"}
            animate="show"
          >
            {data.quality.byStrategy.map((s) => (
              <motion.button
                key={s.strategy}
                id={`audit-strategy-${s.strategy}`}
                type="button"
                onClick={() => openStrategy(s)}
                variants={reduced ? undefined : listItem}
                whileHover={reduced ? undefined : { y: -2 }}
                className="text-left border border-line bg-panel rounded-2xl p-4 shadow-xl shadow-black/5 dark:shadow-black/40 hover:border-signal-pass/40 transition"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-sm font-medium truncate">{s.title}</div>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${TONE_BG[countTone(s.warnings + s.errors)]}`}>
                    {s.total}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-mist">
                  {s.errors} errors · {s.warnings} warnings
                </div>
                <div className="text-[11px] text-signal-pass mt-2">Open findings →</div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" className={btnGhostClass} onClick={expandAll}>
          Expand all
        </button>
        <button type="button" className={btnGhostClass} onClick={collapseAll}>
          Collapse all
        </button>
      </div>

      <div className="space-y-3 pt-4">
        <div id="audit-section-static" ref={refs.static}>
          <Accordion
            title="Static analysis issues"
            summary={`${staticCounts.error} errors, ${staticCounts.warning} warnings, ${staticCounts.info} info`}
            count={data.staticIssues.length}
            tone={countTone(staticCounts.error + staticCounts.warning)}
            open={open.static}
            onToggle={() => toggle("static")}
          >
            <IssuesTable
              issues={data.staticIssues}
              strategyTitles={strategyTitles}
              presetStrategy={strategyFilter}
              onSelect={(issue) => setDetail({ type: "issue", issue })}
            />
          </Accordion>
        </div>
        <div id="audit-section-failed" ref={refs.failed}>
          <Accordion
            title="Failed & pending tests"
            summary={`${data.run.failed} failing · ${data.run.pending} pending · ${failedFiles} files`}
            count={data.run.failedCases.length}
            tone={countTone(data.run.failed)}
            open={open.failed}
            onToggle={() => toggle("failed")}
          >
            <FailedTable cases={data.run.failedCases} onSelect={(item) => setDetail({ type: "failed", item })} />
          </Accordion>
        </div>
        <div id="audit-section-files" ref={refs.files}>
          <Accordion
            title="Test files"
            summary={`${data.run.testFiles.length} files · ${data.run.passed} passed · ${data.run.failed} failed${data.run.success ? "" : " · suite failed"}`}
            count={data.run.testFiles.length}
            countLabel="files"
            tone={countTone(data.run.failed)}
            open={open.files}
            onToggle={() => toggle("files")}
          >
            <TestFilesTable files={data.run.testFiles} onSelect={(file) => setDetail({ type: "file", file })} />
          </Accordion>
        </div>
        <div id="audit-section-cms" ref={refs.cms}>
          <Accordion
            title="CMS migration findings"
            summary={`${data.cms.fromCms} → ${data.cms.toCms} · ${data.cms.stats.legacyIssues} legacy · ${data.cms.stats.gapIssues} gap · ${data.cms.stats.progressSignals} progress`}
            count={cmsTotal}
            tone={countTone(cmsTotal)}
            open={open.cms}
            onToggle={() => toggle("cms")}
          >
            {data.cms.issues.length === 0 ? (
              <Empty>No CMS migration issues in this run.</Empty>
            ) : (
              <IssuesTable
                issues={data.cms.issues}
                strategyTitles={Object.fromEntries(data.cms.byCategory.map((c) => [c.category, c.category]))}
                onSelect={(issue) => setDetail({ type: "issue", issue })}
              />
            )}
          </Accordion>
        </div>
        <div id="audit-section-missing" ref={refs.missing}>
          <Accordion
            title="Missing tests / recommendations"
            summary={`${data.completeness.stats.untested} missing · ${data.completeness.stats.weakCoverage} weak coverage · ${data.completeness.stats.perfRisks} perf/loading · ${data.completeness.stats.highPriority} high priority`}
            count={data.completeness.recommendations.length}
            tone={countTone(data.completeness.recommendations.length)}
            open={open.missing}
            onToggle={() => toggle("missing")}
          >
            <RecommendationsList items={data.completeness.recommendations} onSelect={(rec) => setDetail({ type: "rec", rec })} />
          </Accordion>
        </div>
        <div id="audit-section-coverage" ref={refs.coverage}>
          <Accordion
            title="Coverage"
            summary={`Avg ${data.coverageTotals.statements}% stmts · ${data.coverageTotals.branches}% branches · ${data.coverageTotals.functions}% funcs · ${data.coverageTotals.lines}% lines`}
            count={data.coverage.length}
            countLabel="files"
            tone={scoreTone(data.coverageTotals.lines)}
            open={open.coverage}
            onToggle={() => toggle("coverage")}
          >
            <CoverageTable files={data.coverage} onSelect={(file) => setDetail({ type: "coverage", file })} />
          </Accordion>
        </div>
      </div>

      <DetailModal
        data={data}
        detail={detail}
        strategyIssues={strategyIssues}
        onClose={() => setDetail(null)}
        onOpenIssue={(issue) => setDetail({ type: "issue", issue })}
        onOpenFailed={(item) => setDetail({ type: "failed", item })}
        onOpenStrategy={openStrategy}
        onOpenRec={(rec) => setDetail({ type: "rec", rec })}
      />
    </div>
  );
}

function DetailModal({
  data,
  detail,
  strategyIssues,
  onClose,
  onOpenIssue,
  onOpenFailed,
  onOpenStrategy,
  onOpenRec,
}: {
  data: UserReportView;
  detail: Detail | null;
  strategyIssues: StaticIssue[];
  onClose: () => void;
  onOpenIssue: (issue: StaticIssue) => void;
  onOpenFailed: (item: FailedCase) => void;
  onOpenStrategy: (strategy: QualityStrategy) => void;
  onOpenRec: (rec: CompletenessRec) => void;
}) {
  const title =
    detail?.type === "issue"
      ? detail.issue.rule || "Finding"
      : detail?.type === "strategy"
        ? detail.strategy.title
        : detail?.type === "failed"
          ? detail.item.name
          : detail?.type === "failed-list"
            ? "Failed tests"
            : detail?.type === "tests"
              ? detail.title
              : detail?.type === "issues-filter"
                ? detail.title
                : detail?.type === "file"
                  ? detail.file.fileShort
                  : detail?.type === "coverage"
                    ? detail.file.fileShort
                    : detail?.type === "rec"
                      ? detail.rec.sourceShort
                      : detail?.type === "hero"
                        ? detail.key === "quality"
                          ? "Quality score"
                          : detail.key === "cms"
                            ? "CMS readiness"
                            : "Test completeness"
                        : undefined;

  const subtitle =
    detail?.type === "tests"
      ? detail.sub
      : detail?.type === "issues-filter"
        ? detail.sub
        : detail?.type === "failed-list"
          ? "Failing tests with captured error output."
          : detail?.type === "hero"
            ? HERO_NOTES[detail.key]
            : undefined;

  return (
    <Modal
      open={!!detail}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      widthClass="max-w-6xl"
      id={detail ? `modal-audit-${detail.type}` : "modal-audit-detail"}
    >
      {detail?.type === "issue" && <IssueDetail issue={detail.issue} />}
      {detail?.type === "strategy" && (
        <StrategyDetail
          strategy={detail.strategy}
          issues={strategyIssues}
          onOpenIssue={onOpenIssue}
        />
      )}
      {detail?.type === "failed" && <FailedDetail item={detail.item} />}
      {detail?.type === "failed-list" && (
        <FailedTable cases={data.run.failedCases} onSelect={onOpenFailed} />
      )}
      {detail?.type === "tests" && <TestsList cases={data.run.testCases} status={detail.status} />}
      {detail?.type === "issues-filter" && (
        <IssuesTable
          issues={data.staticIssues}
          strategyTitles={Object.fromEntries(data.quality.byStrategy.map((s) => [s.strategy, s.title]))}
          presetSeverity={detail.severity}
          onSelect={onOpenIssue}
        />
      )}
      {detail?.type === "file" && <FileDetail file={detail.file} />}
      {detail?.type === "coverage" && <CoverageDetail file={detail.file} />}
      {detail?.type === "rec" && <RecDetail rec={detail.rec} />}
      {detail?.type === "hero" && (
        <HeroDetail
          data={data}
          which={detail.key}
          onOpenStrategy={onOpenStrategy}
          onOpenIssue={onOpenIssue}
          onOpenRec={onOpenRec}
        />
      )}
    </Modal>
  );
}

function IssueDetail({ issue }: { issue: StaticIssue }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityChip severity={issue.severity} />
        {issue.rule ? <Chip>{issue.rule}</Chip> : null}
        {issue.strategy ? <Chip>{issue.strategy}</Chip> : null}
        {issue.category ? <Chip>{issue.category}</Chip> : null}
        {issue.line != null ? <Chip>line {issue.line}</Chip> : null}
      </div>
      <p className="text-sm leading-relaxed">{issue.message}</p>
      <PathRow path={issue.file} short={issue.fileShort} />
    </div>
  );
}

function StrategyDetail({
  strategy,
  issues,
  onOpenIssue,
}: {
  strategy: QualityStrategy;
  issues: StaticIssue[];
  onOpenIssue: (issue: StaticIssue) => void;
}) {
  const preview = issues.slice(0, 8);
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed">{strategy.blurb}</p>
      <div className="flex flex-wrap gap-2">
        <Chip tone="fail">{strategy.errors} errors</Chip>
        <Chip tone="warn">{strategy.warnings} warnings</Chip>
        <Chip>{strategy.infos} info</Chip>
        <Chip>{strategy.total} total</Chip>
      </div>
      {preview.length === 0 ? (
        <Empty>No static findings tagged with this strategy.</Empty>
      ) : (
        <div className="divide-y divide-line border border-line rounded-2xl overflow-hidden">
          {preview.map((issue, i) => (
            <button
              key={`${issue.file}-${issue.line}-${i}`}
              type="button"
              onClick={() => onOpenIssue(issue)}
              className="w-full text-left px-4 py-3 hover:bg-panel2/60 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <SeverityChip severity={issue.severity} />
                <span className="font-mono text-[11px] text-mist truncate">{issue.fileShort}</span>
              </div>
              <div className="text-sm truncate">{issue.rule || issue.message}</div>
            </button>
          ))}
        </div>
      )}
      {issues.length > preview.length ? (
        <p className="text-xs text-mist">Showing {preview.length} of {issues.length}. The full list is filtered in Static analysis below.</p>
      ) : null}
    </div>
  );
}

function FailedDetail({ item }: { item: FailedCase }) {
  return (
    <div className="space-y-3">
      <Chip tone={item.status === "failed" ? "fail" : "warn"}>{item.status}</Chip>
      <p className="text-sm font-medium">{item.name}</p>
      <PathRow path={item.file} short={item.fileShort} />
      {item.failureMessages.length > 0 ? (
        <div className="space-y-2">
          {item.failureMessages.map((msg, i) => (
            <pre
              key={i}
              className="text-[11px] font-mono text-mist bg-panel2 border border-line rounded-xl px-3 py-2 overflow-x-auto whitespace-pre-wrap max-h-64"
            >
              {msg}
            </pre>
          ))}
        </div>
      ) : (
        <p className="text-sm text-mist">No stack trace was attached for this case.</p>
      )}
    </div>
  );
}

function FileDetail({ file }: { file: TestFileResult }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Chip tone="pass">{file.passing} passed</Chip>
        <Chip tone={file.failing ? "fail" : "pass"}>{file.failing} failed</Chip>
        <Chip>{file.duration}ms</Chip>
      </div>
      <PathRow path={file.file} short={file.fileShort} />
      {file.failureMessages.length > 0 ? (
        <div className="space-y-2">
          {file.failureMessages.map((msg, i) => (
            <pre
              key={i}
              className="text-[11px] font-mono text-mist bg-panel2 border border-line rounded-xl px-3 py-2 overflow-x-auto whitespace-pre-wrap max-h-64"
            >
              {msg}
            </pre>
          ))}
        </div>
      ) : (
        <p className="text-sm text-mist">This file reported no failure messages.</p>
      )}
    </div>
  );
}

function CoverageDetail({ file }: { file: CoverageFileRow }) {
  return (
    <div className="space-y-4">
      <PathRow path={file.file} short={file.fileShort} />
      <CoverageBars
        coverage={{
          statements: Math.round(file.statements),
          branches: Math.round(file.branches),
          functions: Math.round(file.functions),
          lines: Math.round(file.lines),
        }}
      />
    </div>
  );
}

function RecDetail({ rec }: { rec: CompletenessRec }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Chip tone={rec.priority === "high" ? "fail" : "warn"}>{rec.priority}</Chip>
        <Chip>{rec.tag}</Chip>
        <Chip>{rec.kind}</Chip>
        {rec.coverageLines != null ? <Chip>{rec.coverageLines}% lines</Chip> : null}
      </div>
      <PathRow path={rec.source} short={rec.sourceShort} />
      <p className="text-sm">{rec.why}</p>
      <p className="text-sm text-mist">{rec.suggest}</p>
      {rec.exports.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-mist mb-1.5">Exports to cover</div>
          <div className="flex flex-wrap gap-1">
            {rec.exports.map((e) => (
              <span key={e} className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-line text-mist">
                {e}
              </span>
            ))}
          </div>
        </div>
      )}
      {rec.matchedTests.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-mist mb-1.5">Matched tests</div>
          <ul className="text-xs font-mono text-mist space-y-1">
            {rec.matchedTests.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HeroDetail({
  data,
  which,
  onOpenStrategy,
  onOpenIssue,
  onOpenRec,
}: {
  data: UserReportView;
  which: "quality" | "cms" | "completeness";
  onOpenStrategy: (strategy: QualityStrategy) => void;
  onOpenIssue: (issue: StaticIssue) => void;
  onOpenRec: (rec: CompletenessRec) => void;
}) {
  const block =
    which === "quality" ? data.quality : which === "cms" ? data.cms : data.completeness;
  const sTone = scoreTone(block.score);
  const gTone = gradeTone(block.grade);

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className={`border ${TONE_BORDER[sTone]} bg-panel2/40 rounded-2xl p-4`}>
          <div className="text-[10px] uppercase tracking-widest text-mist mb-1">Score</div>
          <div className={`font-display text-3xl font-bold ${TONE_TEXT[sTone]}`}>
            {block.score}
            <span className="text-lg text-mist font-medium">/100</span>
          </div>
        </div>
        <div className={`border ${TONE_BORDER[gTone]} bg-panel2/40 rounded-2xl p-4`}>
          <div className="text-[10px] uppercase tracking-widest text-mist mb-1">Grade</div>
          <div className={`font-display text-3xl font-bold ${TONE_TEXT[gTone]}`}>{block.grade}</div>
          <div className={`text-xs mt-0.5 ${TONE_TEXT[gTone]}`}>{block.label}</div>
        </div>
      </div>
      <p className="text-sm leading-relaxed">{block.summary}</p>

      {which === "quality" && (
        <div className="space-y-3">
          {data.quality.byStrategy.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.quality.byStrategy.map((s) => (
                <button
                  key={s.strategy}
                  type="button"
                  onClick={() => onOpenStrategy(s)}
                  className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-line text-mist hover:border-signal-pass/40 hover:text-signal-pass transition-colors"
                >
                  {s.title}
                  {s.total ? ` · ${s.total}` : ""}
                </button>
              ))}
            </div>
          )}
          <IssuesTable
            issues={data.staticIssues}
            strategyTitles={Object.fromEntries(data.quality.byStrategy.map((s) => [s.strategy, s.title]))}
            onSelect={onOpenIssue}
          />
        </div>
      )}

      {which === "cms" && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-mist">
            {data.cms.fromCms} <span className="text-chalk">→</span> {data.cms.toCms}
          </p>
          <div className="flex flex-wrap gap-2">
            <Chip>{data.cms.stats.filesScanned} scanned</Chip>
            <Chip tone="warn">{data.cms.stats.filesWithLegacyRefs} legacy files</Chip>
            <Chip tone="fail">{data.cms.stats.legacyIssues} legacy issues</Chip>
            <Chip tone="warn">{data.cms.stats.gapIssues} gaps</Chip>
            <Chip tone="pass">{data.cms.stats.progressSignals} progress</Chip>
            {data.cms.byCategory.map((c) => (
              <Chip key={c.category}>
                {c.category} · {c.count}
              </Chip>
            ))}
          </div>
          {data.cms.issues.length === 0 ? (
            <p className="text-sm text-mist">No CMS migration issues in this run.</p>
          ) : (
            <IssuesTable
              issues={data.cms.issues}
              strategyTitles={Object.fromEntries(data.cms.byCategory.map((c) => [c.category, c.category]))}
              onSelect={onOpenIssue}
            />
          )}
        </div>
      )}

      {which === "completeness" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Chip>{data.completeness.stats.sourcesScanned} scanned</Chip>
            <Chip tone="pass">{data.completeness.stats.withTests} with tests</Chip>
            <Chip tone="warn">{data.completeness.stats.untested} untested</Chip>
            <Chip tone="warn">{data.completeness.stats.weakCoverage} weak coverage</Chip>
            <Chip>{data.completeness.stats.perfRisks} perf risks</Chip>
            <Chip>{data.completeness.stats.recommendations} recommendations</Chip>
            <Chip tone="fail">{data.completeness.stats.highPriority} high priority</Chip>
          </div>
          {data.completeness.recommendations.length === 0 ? (
            <p className="text-sm text-mist">No completeness recommendations in this run.</p>
          ) : (
            <RecommendationsList items={data.completeness.recommendations} onSelect={onOpenRec} />
          )}
        </div>
      )}
    </div>
  );
}

function PathRow({ path, short }: { path: string; short: string }) {
  return (
    <div className="flex items-start justify-between gap-3 bg-panel2 border border-line rounded-xl px-3 py-2">
      <div className="min-w-0">
        <div className="font-mono text-xs truncate">{short}</div>
        <div className="font-mono text-[10px] text-mist break-all mt-0.5">{path}</div>
      </div>
      <CopyTextButton value={path} label="Copy path" />
    </div>
  );
}

function SeverityChip({ severity }: { severity: string }) {
  const tone: Tone = severity === "error" ? "fail" : severity === "warning" ? "warn" : "neutral";
  return <Chip tone={tone}>{severity}</Chip>;
}

function AnimatedNumber({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(value);

  useEffect(() => {
    if (reduced) {
      setN(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = n;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 700);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  return <>{n.toLocaleString()}</>;
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: Tone }) {
  const t = tone ?? "neutral";
  return (
    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${TONE_BORDER[t]} ${TONE_TEXT[t]}`}>
      {children}
    </span>
  );
}

function Accordion({
  title,
  summary,
  count,
  countLabel,
  tone,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  count: number;
  countLabel?: string;
  tone: Tone;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <section className="border border-line bg-panel rounded-2xl overflow-hidden shadow-xl shadow-black/5 dark:shadow-black/40">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-panel2/50 transition-colors text-left"
      >
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-mist mt-0.5">{summary}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs font-mono min-w-[1.75rem] h-7 px-2 rounded-full flex items-center justify-center ${TONE_BG[tone]}`}>
            {count.toLocaleString()}
            {countLabel ? ` ${countLabel}` : ""}
          </span>
          <motion.svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-mist"
            animate={{ rotate: open ? 0 : -90 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
          >
            <path d="M6 9l6 6 6-6" />
          </motion.svg>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-5 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-mist text-center px-8 py-16">{children}</div>;
}

function Pager({
  total,
  page,
  pages,
  onPrev,
  onNext,
}: {
  total: number;
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-[11px] font-mono text-mist">
      <button
        type="button"
        disabled={page <= 1}
        onClick={onPrev}
        className="inline-flex min-w-[72px] items-center justify-center rounded-full border border-line bg-panel2/70 px-3 py-1.5 font-medium text-mist transition-all hover:border-signal-pass/40 hover:text-signal-pass hover:bg-signal-pass/5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:text-mist disabled:hover:bg-panel2/70"
      >
        Prev
      </button>
      <span className="inline-flex min-w-[52px] justify-center rounded-full border border-signal-pass/35 bg-signal-pass/10 px-2.5 py-1.5 text-signal-pass">
        {page}/{pages}
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={onNext}
        className="inline-flex min-w-[72px] items-center justify-center rounded-full border border-line bg-panel2/70 px-3 py-1.5 font-medium text-mist transition-all hover:border-signal-pass/40 hover:text-signal-pass hover:bg-signal-pass/5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:text-mist disabled:hover:bg-panel2/70"
      >
        Next
      </button>
    </div>
  );
}

function IssuesTable({
  issues,
  strategyTitles = {},
  presetStrategy,
  presetSeverity,
  onSelect,
}: {
  issues: StaticIssue[];
  strategyTitles?: Record<string, string>;
  presetStrategy?: string | null;
  presetSeverity?: string | null;
  onSelect: (issue: StaticIssue) => void;
}) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState(presetSeverity ?? "all");
  const [strategy, setStrategy] = useState(presetStrategy ?? "all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (presetStrategy) setStrategy(presetStrategy);
  }, [presetStrategy]);

  useEffect(() => {
    if (presetSeverity) setSeverity(presetSeverity);
  }, [presetSeverity]);

  const strategies = useMemo(
    () => Array.from(new Set(issues.map((i) => i.strategy).filter(Boolean))).sort(),
    [issues]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter((i) => {
      if (severity !== "all" && i.severity !== severity) return false;
      if (strategy !== "all" && i.strategy !== strategy) return false;
      if (!q) return true;
      return (
        i.fileShort.toLowerCase().includes(q) ||
        i.file.toLowerCase().includes(q) ||
        i.rule.toLowerCase().includes(q) ||
        i.strategy.toLowerCase().includes(q) ||
        i.message.toLowerCase().includes(q)
      );
    });
  }, [issues, query, severity, strategy]);

  useEffect(() => setPage(1), [query, severity, strategy]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (issues.length === 0) return <Empty>No static analysis issues.</Empty>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3 min-w-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search file, rule, strategy, message…"
          className={`${fieldInlineClass} min-w-0 flex-1`}
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className={`${fieldInlineClass} shrink-0 w-auto text-[11px] font-mono text-mist`}
        >
          <option value="all">All severities</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          className={`${fieldInlineClass} shrink-0 w-auto text-[11px] font-mono text-mist`}
        >
          <option value="all">All strategies</option>
          {strategies.map((s) => (
            <option key={s} value={s}>
              {strategyTitles[s] ?? s}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-0">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-mist">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium w-[28%]">File</th>
              <th className="py-2 pr-3 font-medium w-24">Severity</th>
              <th className="py-2 font-medium">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {slice.map((i, idx) => (
              <tr
                key={`${i.file}-${i.line}-${idx}`}
                className="cursor-pointer hover:bg-panel2/60 transition-colors"
                onClick={() => onSelect(i)}
              >
                <td className="py-2.5 pr-3 font-mono text-mist truncate" title={i.file}>
                  {i.fileShort}
                </td>
                <td className="py-2.5 pr-3">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${TONE_BG[i.severity === "error" ? "fail" : i.severity === "warning" ? "warn" : "neutral"]}`}>
                    {i.severity}
                  </span>
                </td>
                <td className="py-2.5 text-sm truncate" title={i.message}>
                  {i.rule || i.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager
        total={filtered.length}
        page={page}
        pages={pages}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />
    </div>
  );
}

function TestFilesTable({
  files,
  onSelect,
}: {
  files: TestFileResult[];
  onSelect: (file: TestFileResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [failingOnly, setFailingOnly] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.filter((f) => {
      if (failingOnly && f.failing <= 0) return false;
      if (!q) return true;
      return f.fileShort.toLowerCase().includes(q) || f.file.toLowerCase().includes(q);
    });
  }, [files, query, failingOnly]);

  useEffect(() => setPage(1), [query, failingOnly]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (files.length === 0) return <Empty>No test file results in this run.</Empty>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter test files…"
          className={`${fieldInlineClass} min-w-0 flex-1`}
        />
        <button
          type="button"
          onClick={() => setFailingOnly((v) => !v)}
          className={`${chipClass} ${failingOnly ? "border-signal-fail/40 text-signal-fail bg-signal-fail/10" : chipIdleClass}`}
        >
          Failing
        </button>
      </div>
      <div className="min-w-0">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-mist">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">File</th>
              <th className="py-2 font-medium w-24">Failed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {slice.map((f) => (
              <tr
                key={f.file}
                className="cursor-pointer hover:bg-panel2/60 transition-colors"
                onClick={() => onSelect(f)}
              >
                <td className="py-2.5 pr-3 font-mono truncate" title={f.file}>
                  {f.fileShort}
                </td>
                <td className={`py-2.5 font-mono ${f.failing ? "text-signal-fail" : "text-mist"}`}>{f.failing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager
        total={filtered.length}
        page={page}
        pages={pages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(pages, p + 1))}
      />
    </div>
  );
}

function TestsList({ cases, status }: { cases: TestCaseRow[]; status: string }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.fileShort.toLowerCase().includes(q) ||
        c.file.toLowerCase().includes(q)
      );
    });
  }, [cases, query, status]);

  useEffect(() => setPage(1), [query, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (cases.length === 0) return <Empty>No tests in this run.</Empty>;

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search test name or file…"
        className={`${fieldCompactClass} mb-3`}
      />
      {filtered.length === 0 ? (
        <Empty>No tests match this filter.</Empty>
      ) : (
        <>
          <div className="divide-y divide-line">
            {slice.map((c, i) => (
              <div key={`${c.file}-${c.name}-${i}`} className="py-2.5">
                <div className="flex items-center gap-2">
                  <Chip tone={c.status === "failed" ? "fail" : c.status === "passed" ? "pass" : "warn"}>
                    {c.status}
                  </Chip>
                  <span className="text-sm truncate">{c.name}</span>
                </div>
                <div className="text-[11px] font-mono text-mist mt-0.5 truncate">{c.fileShort}</div>
              </div>
            ))}
          </div>
          <Pager
            total={filtered.length}
            page={page}
            pages={pages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(pages, p + 1))}
          />
        </>
      )}
    </div>
  );
}

function FailedTable({
  cases,
  onSelect,
}: {
  cases: FailedCase[];
  onSelect: (item: FailedCase) => void;
}) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(cases.length / PAGE_SIZE));
  const slice = cases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (cases.length === 0) return <Empty>No failing tests in this run.</Empty>;

  return (
    <div>
      <div className="divide-y divide-line">
        {slice.map((c, i) => (
          <button
            key={`${c.file}-${c.name}-${i}`}
            type="button"
            onClick={() => onSelect(c)}
            className="w-full text-left py-2.5 hover:bg-panel2/60 -mx-2 px-2 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-2">
              <Chip tone={c.status === "failed" ? "fail" : "warn"}>{c.status}</Chip>
              <span className="text-sm truncate">{c.name}</span>
            </div>
            <div className="text-[11px] font-mono text-mist mt-0.5 truncate">{c.fileShort}</div>
          </button>
        ))}
      </div>
      <Pager
        total={cases.length}
        page={page}
        pages={pages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(pages, p + 1))}
      />
    </div>
  );
}

function RecommendationsList({
  items,
  onSelect,
}: {
  items: CompletenessRec[];
  onSelect: (rec: CompletenessRec) => void;
}) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const [kind, setKind] = useState("all");
  const [tag, setTag] = useState("all");
  const [page, setPage] = useState(1);

  const priorities = useMemo(
    () => Array.from(new Set(items.map((i) => i.priority).filter(Boolean))).sort(),
    [items]
  );
  const kinds = useMemo(
    () => Array.from(new Set(items.map((i) => i.kind).filter(Boolean))).sort(),
    [items]
  );
  const tags = useMemo(
    () => Array.from(new Set(items.map((i) => i.tag).filter(Boolean))).sort(),
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (priority !== "all" && item.priority !== priority) return false;
      if (kind !== "all" && item.kind !== kind) return false;
      if (tag !== "all" && item.tag !== tag) return false;
      if (!q) return true;
      return (
        item.sourceShort.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        item.why.toLowerCase().includes(q) ||
        item.suggest.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.kind.toLowerCase().includes(q) ||
        item.exports.some((e) => e.toLowerCase().includes(q))
      );
    });
  }, [items, query, priority, kind, tag]);

  useEffect(() => setPage(1), [query, priority, kind, tag]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (items.length === 0) return <Empty>No missing-test recommendations.</Empty>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search file, reason, suggestion…"
          className={`${fieldInlineClass} min-w-0 flex-1`}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className={`${fieldInlineClass} shrink-0 w-auto text-[11px] font-mono text-mist`}
        >
          <option value="all">All priorities</option>
          {priorities.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className={`${fieldInlineClass} shrink-0 w-auto text-[11px] font-mono text-mist`}
        >
          <option value="all">All kinds</option>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className={`${fieldInlineClass} shrink-0 w-auto text-[11px] font-mono text-mist`}
        >
          <option value="all">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Empty>No recommendations match the current filters.</Empty>
      ) : (
        <>
          <div className="space-y-3">
            {slice.map((item) => (
              <button
                key={item.source}
                type="button"
                onClick={() => onSelect(item)}
                className="w-full text-left border border-line rounded-2xl p-3 hover:border-signal-pass/40 hover:bg-panel2/40 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs truncate">{item.sourceShort}</span>
                  <Chip tone={item.priority === "high" ? "fail" : "warn"}>{item.priority}</Chip>
                </div>
              </button>
            ))}
          </div>
          <Pager
            total={filtered.length}
            page={page}
            pages={pages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(pages, p + 1))}
          />
        </>
      )}
    </div>
  );
}

function pctClass(v: number) {
  if (v >= 90) return "text-signal-pass";
  if (v >= 70) return "text-signal-warn";
  return "text-signal-fail";
}

function CoverageTable({
  files,
  onSelect,
}: {
  files: CoverageFileRow[];
  onSelect: (file: CoverageFileRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"lines" | "branches" | "file">("lines");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = files.filter(
      (f) => !q || f.fileShort.toLowerCase().includes(q) || f.file.toLowerCase().includes(q)
    );
    return [...rows].sort((a, b) => {
      if (sort === "file") return a.fileShort.localeCompare(b.fileShort);
      return a[sort] - b[sort];
    });
  }, [files, query, sort]);

  useEffect(() => setPage(1), [query, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / COVERAGE_PAGE));
  const slice = filtered.slice((page - 1) * COVERAGE_PAGE, page * COVERAGE_PAGE);

  if (files.length === 0) return <Empty>No coverage files in this report.</Empty>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter files…"
          className={`${fieldCompactClass} flex-1 min-w-0 mb-0`}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className={`${fieldInlineClass} shrink-0 w-auto text-[11px] font-mono text-mist`}
        >
          <option value="lines">Lowest lines</option>
          <option value="branches">Lowest branches</option>
          <option value="file">File name</option>
        </select>
      </div>
      <div className="min-w-0">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-mist">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">File</th>
              <th className="py-2 font-medium w-20">Lines</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {slice.map((f) => (
              <tr
                key={f.file}
                className="cursor-pointer hover:bg-panel2/60 transition-colors"
                onClick={() => onSelect(f)}
              >
                <td className="py-2 pr-3 font-mono truncate" title={f.file}>
                  {f.fileShort}
                </td>
                <td className={`py-2 font-mono ${pctClass(f.lines)}`}>{Math.round(f.lines)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager
        total={filtered.length}
        page={page}
        pages={pages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(pages, p + 1))}
      />
    </div>
  );
}
