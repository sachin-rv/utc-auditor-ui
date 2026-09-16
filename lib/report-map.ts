import type { CoverageMetrics, Finding } from "./types";
import type { ApiReportDetail, ApiReportListItem } from "./api-types";
import { parseUserReport, shortPath } from "./user-report";
import { businessFindingTitle, humanizeCategory, humanizeTechnicalText } from "./business-copy";
import { displayPercent, displayQualityScore, firstPositive, gradeFromScore } from "./display-score";

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function coverageFromJson(
  reportJson: Record<string, unknown> | undefined,
  coveragePercent?: number
): CoverageMetrics {
  const fallback = Math.round(coveragePercent ?? 0);
  const user = parseUserReport(reportJson);
  if (user && user.coverage.length) {
    return user.coverageTotals;
  }

  const coverage = reportJson?.coverage;
  if (Array.isArray(coverage) && coverage.length) {
    const avg = (key: "statements" | "branches" | "functions" | "lines") => {
      const sum = coverage.reduce((acc, row) => {
        const n = rec(row)[key];
        return acc + (typeof n === "number" && Number.isFinite(n) ? n : 0);
      }, 0);
      return Math.round(sum / coverage.length);
    };
    return {
      statements: avg("statements"),
      branches: avg("branches"),
      functions: avg("functions"),
      lines: avg("lines"),
    };
  }

  const coverageObj = rec(coverage);
  const pct = (key: string) => {
    const node = coverageObj[key];
    if (typeof node === "number") return Math.round(node);
    if (node && typeof node === "object" && "pct" in node) {
      const n = (node as { pct?: number }).pct;
      if (typeof n === "number") return Math.round(n);
    }
    return undefined;
  };
  return {
    statements: pct("statements") ?? fallback,
    branches: pct("branches") ?? fallback,
    functions: pct("functions") ?? fallback,
    lines: pct("lines") ?? fallback,
  };
}

export function mapStatus(status?: string) {
  if (status === "pass" || status === "success") return "success";
  if (status === "warning" || status === "completed_with_errors") return "completed_with_errors";
  if (status === "fail" || status === "failed") return "failed";
  return status || "no_reports";
}

function asFindingSeverity(value: unknown): Finding["severity"] {
  const s = String(value ?? "");
  if (s === "error" || s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "warning" || s === "medium") return "medium";
  if (s === "low") return "low";
  return "info";
}

function pushFinding(
  out: Finding[],
  row: Record<string, unknown>,
  i: number,
  defaults: { idPrefix: string; category: string; ruleId: string }
) {
  const file = row.file ? String(row.file) : row.source ? String(row.source) : undefined;
  const line = typeof row.line === "number" ? row.line : undefined;
  out.push({
    id: String(row.id ?? `${defaults.idPrefix}-${i}`),
    ruleId: String(row.ruleId ?? row.rule ?? row.tag ?? defaults.ruleId),
    ruleVersion: String(row.ruleVersion ?? "1"),
    category: String(row.category ?? row.strategy ?? row.kind ?? defaults.category),
    title: String(row.title ?? row.message ?? row.why ?? "Finding"),
    severity: asFindingSeverity(row.severity ?? row.priority),
    detail: String(row.detail ?? row.message ?? row.why ?? ""),
    recommendation: String(row.recommendation ?? row.suggestion ?? row.suggest ?? ""),
    file: file ? (line != null ? `${shortPath(file)}:${line}` : shortPath(file)) : undefined,
  });
  const last = out[out.length - 1];
  last.title = businessFindingTitle(last.title, last.detail, file);
  last.detail = humanizeTechnicalText(last.detail, file);
  last.recommendation = last.recommendation ? humanizeTechnicalText(last.recommendation, file) : "";
  last.category = humanizeCategory(last.category);
}

export function findingsFromJson(reportJson: Record<string, unknown> | undefined): Finding[] {
  if (!reportJson) return [];
  const out: Finding[] = [];
  const ruleResults = reportJson.ruleResults;
  if (Array.isArray(ruleResults)) {
    for (const [i, r] of ruleResults.entries()) {
      pushFinding(out, rec(r), i, { idPrefix: "rule", category: "quality", ruleId: "rule" });
    }
  }
  const findings = reportJson.findings;
  if (Array.isArray(findings) && out.length === 0) {
    for (const [i, f] of findings.entries()) {
      pushFinding(out, rec(f), i, { idPrefix: "finding", category: "quality", ruleId: "finding" });
    }
  }
  const staticIssues = reportJson.staticIssues;
  if (Array.isArray(staticIssues)) {
    for (const [i, f] of staticIssues.entries()) {
      pushFinding(out, rec(f), i, { idPrefix: "static", category: "static-analysis", ruleId: "static" });
    }
  }
  const cmsIssues = rec(reportJson.cmsMigration).issues;
  if (Array.isArray(cmsIssues)) {
    for (const [i, f] of cmsIssues.entries()) {
      pushFinding(out, rec(f), i, { idPrefix: "cms", category: "cms-migration", ruleId: "cms" });
    }
  }
  const recs = rec(reportJson.testCompleteness).recommendations;
  if (Array.isArray(recs) && out.length === 0) {
    for (const [i, f] of recs.entries()) {
      pushFinding(out, rec(f), i, { idPrefix: "gap", category: "completeness", ruleId: "missing-test" });
    }
  }
  return out;
}

export function listRowFromApi(r: ApiReportListItem) {
  const s = r.summary ?? {};
  const json = r.reportJson ?? {};
  const user = parseUserReport(json);
  const coverage = coverageFromJson(json, s.coveragePercent ?? user?.coverageTotals.lines);
  const passed = s.passedTests ?? user?.run.passed ?? 0;
  const total = s.totalTests ?? user?.run.total ?? 0;
  const failed = s.failedTests ?? user?.run.failed ?? Math.max(0, total - passed);
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  const overallScore = displayQualityScore({
    qualityScore: firstPositive(s.auditScore, user?.quality.score),
    passRate,
    coverage: coverage.lines,
    completeness: user?.completeness.score,
    cmsReadiness: user?.cms.score,
    totalTests: total,
  });
  const findingsCount = findingsFromJson(json).length || user?.staticIssues.length || 0;
  const status = s.status
    ? mapStatus(s.status)
    : failed > 0
      ? "failed"
      : findingsCount > 0
        ? "warning"
        : user || overallScore
          ? "success"
          : "no_reports";
  const libraryGrade = user?.quality.grade;
  const qualityGrade =
    firstPositive(s.auditScore, user?.quality.score) && libraryGrade
      ? libraryGrade
      : gradeFromScore(overallScore);
  return {
    id: r.id,
    timestamp: r.generatedAt,
    trigger: r.pipeline?.triggeredBy ?? r.pipeline?.provider ?? "pipeline",
    overallScore,
    passed,
    total,
    failed,
    coverage,
    coveragePercent: firstPositive(s.coveragePercent, coverage.lines) ?? displayPercent(coverage.lines),
    status,
    qualityGrade,
    completenessScore: user?.completeness.score
      ? displayPercent(user.completeness.score)
      : undefined,
    cmsReadiness: user?.cms.score ? displayPercent(user.cms.score) : undefined,
    findingsCount,
  };
}

export function detailView(report: ApiReportDetail) {
  const s = report.summary ?? {};
  const json = report.reportJson ?? {};
  const user = parseUserReport(json);
  const findings = findingsFromJson(json);
  const coverage = coverageFromJson(json, s.coveragePercent ?? user?.coverageTotals.lines);
  const total = s.totalTests ?? user?.run.total ?? 0;
  const passed = s.passedTests ?? user?.run.passed ?? 0;
  const failed = s.failedTests ?? user?.run.failed ?? 0;
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  const overallScore = displayQualityScore({
    qualityScore: firstPositive(s.auditScore, user?.quality.score),
    passRate,
    coverage: coverage.lines,
    completeness: user?.completeness.score,
    cmsReadiness: user?.cms.score,
    totalTests: total,
  });
  const libraryGrade = user?.quality.grade;
  const grade =
    firstPositive(s.auditScore, user?.quality.score) && libraryGrade
      ? libraryGrade
      : gradeFromScore(overallScore);
  const topRisks = (user?.quality.byStrategy ?? [])
    .slice()
    .sort((a, b) => b.errors * 2 + b.warnings - (a.errors * 2 + a.warnings))
    .filter((item) => item.total > 0)
    .slice(0, 4)
    .map((item) => ({
      title: item.title,
      detail: item.blurb,
      count: item.total,
    }));
  return {
    id: report.id,
    reportId: report.reportId,
    clientId: report.clientId,
    projectId: report.projectId,
    timestamp: report.generatedAt,
    overallScore,
    grade,
    cmsCoverage: displayPercent(user?.completeness.score ?? coverage.lines),
    cmsReadiness: displayPercent(user?.cms.score ?? 100),
    coverage,
    testExecution: {
      total,
      passed,
      failed,
      skipped: 0,
      pending: user?.run.pending ?? 0,
      durationMs: 0,
    },
    findings,
    status: mapStatus(s.status),
    pipeline: report.pipeline,
    hasDetailed: Boolean(user),
    rawJson: json,
    topRisks,
  };
}
