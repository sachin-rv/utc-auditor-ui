import { humanizeTechnicalText } from "./business-copy";
import { displayQualityScore, firstPositive, gradeFromScore } from "./display-score";

export type IssueSeverity = "error" | "warning" | "info";
export type Tone = "pass" | "warn" | "fail" | "neutral";

export interface StaticIssue {
  file: string;
  fileShort: string;
  line: number | null;
  rule: string;
  strategy: string;
  message: string;
  severity: IssueSeverity;
  category?: string;
}

export interface FailedCase {
  file: string;
  fileShort: string;
  name: string;
  status: string;
  failureMessages: string[];
}

export interface QualityStrategy {
  strategy: string;
  title: string;
  blurb: string;
  errors: number;
  warnings: number;
  infos: number;
  total: number;
}

export interface CoverageFileRow {
  file: string;
  fileShort: string;
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface TestFileResult {
  file: string;
  fileShort: string;
  passing: number;
  failing: number;
  duration: number;
  failureMessages: string[];
}

export interface CompletenessRec {
  source: string;
  sourceShort: string;
  kind: string;
  priority: string;
  tag: string;
  why: string;
  suggest: string;
  exports: string[];
  coverageLines: number | null;
  matchedTests: string[];
}

export interface ScoreBlock {
  score: number;
  grade: string;
  label: string;
  summary: string;
}

export interface TestCaseRow {
  file: string;
  fileShort: string;
  name: string;
  status: string;
}

export interface UserReportView {
  quality: ScoreBlock & { byStrategy: QualityStrategy[] };
  cms: ScoreBlock & {
    fromCms: string;
    toCms: string;
    stats: {
      filesScanned: number;
      filesWithLegacyRefs: number;
      legacyIssues: number;
      gapIssues: number;
      progressSignals: number;
    };
    byCategory: { category: string; count: number }[];
    issues: StaticIssue[];
  };
  completeness: ScoreBlock & {
    stats: {
      sourcesScanned: number;
      withTests: number;
      untested: number;
      weakCoverage: number;
      perfRisks: number;
      recommendations: number;
      highPriority: number;
    };
    recommendations: CompletenessRec[];
  };
  run: {
    success: boolean;
    total: number;
    passed: number;
    failed: number;
    pending: number;
    todo: number;
    failedCases: FailedCase[];
    testCases: TestCaseRow[];
    testFiles: TestFileResult[];
  };
  staticIssues: StaticIssue[];
  coverage: CoverageFileRow[];
  coverageTotals: { statements: number; branches: number; functions: number; lines: number };
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function num(v: unknown, fallback = 0) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

export function stripAnsi(text: string) {
  return text.replace(/\u001B\[[0-9;]*m/g, "").replace(/\x1B\[[0-9;]*m/g, "");
}

export function shortPath(file: string) {
  const n = file.replace(/\\/g, "/");
  const markers = ["/nextjs-sample-app/", "/apps/web/", "/apps/", "/src/"];
  for (const m of markers) {
    const i = n.lastIndexOf(m);
    if (i >= 0) return n.slice(i + m.length);
  }
  const parts = n.split("/").filter(Boolean);
  return parts.slice(-4).join("/");
}

export function failureHeadline(message: string) {
  const clean = stripAnsi(message).trim();
  const line =
    clean.split("\n").find((l) => {
      const t = l.trim();
      return t && !t.startsWith("at ") && !t.startsWith("Ignored nodes");
    }) ?? clean.split("\n")[0] ?? "";
  return line.replace(/^Error:\s*/, "").slice(0, 220);
}

export function unwrapReportJson(json: Record<string, unknown> | undefined | null): Record<string, unknown> | null {
  if (!json) return null;
  if (isUserReport(json)) return json;
  const nested = rec(json.reportJson);
  if (isUserReport(nested)) return nested;
  const payload = rec(json.payload);
  if (isUserReport(payload)) return payload;
  return json;
}

export function isUserReport(json: Record<string, unknown> | undefined | null): boolean {
  if (!json) return false;
  const quality = rec(json.quality);
  const run = rec(json.runSummary);
  return (
    typeof quality.score === "number" ||
    typeof run.numTotalTests === "number" ||
    Array.isArray(json.staticIssues) ||
    Array.isArray(json.coverage)
  );
}

function asIssue(row: Record<string, unknown>): StaticIssue {
  const sev = str(row.severity, "info");
  const category = str(row.category) || undefined;
  return {
    file: str(row.file),
    fileShort: shortPath(str(row.file)),
    line: typeof row.line === "number" ? row.line : null,
    rule: str(row.rule),
    strategy: str(row.strategy || row.category),
    message: humanizeTechnicalText(str(row.message), str(row.file)),
    severity: sev === "error" || sev === "warning" ? sev : "info",
    category,
  };
}

function avgMetric(files: CoverageFileRow[], key: keyof Pick<CoverageFileRow, "statements" | "branches" | "functions" | "lines">) {
  if (files.length === 0) return 0;
  const sum = files.reduce((acc, f) => acc + f[key], 0);
  return Math.round(sum / files.length);
}

export function parseUserReport(json: Record<string, unknown> | undefined | null): UserReportView | null {
  const unwrapped = unwrapReportJson(json);
  if (!unwrapped || !isUserReport(unwrapped)) return null;
  const j = unwrapped;
  const quality = rec(j.quality);
  const run = rec(j.runSummary);
  const cmsRoot = rec(j.cmsMigration);
  const readiness = rec(cmsRoot.readiness);
  const completenessRoot = rec(j.testCompleteness);
  const completeness = rec(completenessRoot.completeness);
  const cmsStats = rec(readiness.stats);
  const compStats = rec(completeness.stats);
  const fromCms = rec(readiness.fromCms);
  const toCms = rec(readiness.toCms);

  const staticIssues = (Array.isArray(j.staticIssues) ? j.staticIssues : []).map((r) => asIssue(rec(r)));
  const cmsIssues = (Array.isArray(cmsRoot.issues) ? cmsRoot.issues : []).map((r) => asIssue(rec(r)));

  const testFiles: TestFileResult[] = (Array.isArray(run.testResults) ? run.testResults : []).map((r) => {
    const row = rec(r);
    const file = str(row.testFilePath ?? row.file);
    return {
      file,
      fileShort: shortPath(file),
      passing: num(row.numPassingTests),
      failing: num(row.numFailingTests),
      duration: num(row.duration),
      failureMessages: Array.isArray(row.failureMessages)
        ? row.failureMessages.map((m) => stripAnsi(String(m)))
        : [],
    };
  });

  const messagesByFile = new Map(testFiles.map((f) => [f.file, f.failureMessages]));

  const failedCases: FailedCase[] = [];
  const testCases: TestCaseRow[] = [];
  const cases = Array.isArray(run.failedCases)
    ? run.failedCases
    : Array.isArray(run.testCases)
      ? run.testCases
      : [];
  for (const c of cases) {
    const row = rec(c);
    const status = str(row.status, "passed");
    const file = str(row.file);
    const name = str(row.name);
    testCases.push({
      file,
      fileShort: shortPath(file),
      name,
      status,
    });
    if (status === "passed") continue;
    const fileMsgs = messagesByFile.get(file) ?? [];
    const matched = fileMsgs.filter((m) => m.includes(name));
    failedCases.push({
      file,
      fileShort: shortPath(file),
      name,
      status,
      failureMessages: matched.length ? matched : fileMsgs,
    });
  }

  const coverage = (Array.isArray(j.coverage) ? j.coverage : []).map((r) => {
    const row = rec(r);
    const file = str(row.file);
    return {
      file,
      fileShort: shortPath(file),
      statements: num(row.statements),
      branches: num(row.branches),
      functions: num(row.functions),
      lines: num(row.lines),
    };
  });

  const byStrategy: QualityStrategy[] = (Array.isArray(quality.byStrategy) ? quality.byStrategy : []).map((r) => {
    const row = rec(r);
    return {
      strategy: str(row.strategy),
      title: str(row.title),
      blurb: humanizeTechnicalText(str(row.blurb)),
      errors: num(row.errors),
      warnings: num(row.warnings),
      infos: num(row.infos),
      total: num(row.total),
    };
  });

  const recommendations: CompletenessRec[] = (
    Array.isArray(completenessRoot.recommendations) ? completenessRoot.recommendations : []
  ).map((r) => {
    const row = rec(r);
    const source = str(row.source);
    const coverageLines = row.coverageLines;
    return {
      source,
      sourceShort: shortPath(source),
      kind: str(row.kind),
      priority: str(row.priority),
      tag: str(row.tag),
      why: humanizeTechnicalText(str(row.why), source),
      suggest: humanizeTechnicalText(str(row.suggest), source),
      exports: Array.isArray(row.exports) ? row.exports.map(String) : [],
      coverageLines: typeof coverageLines === "number" ? coverageLines : null,
      matchedTests: Array.isArray(row.matchedTests) ? row.matchedTests.map(String) : [],
    };
  });

  const byCategory = (Array.isArray(readiness.byCategory) ? readiness.byCategory : []).map((r) => {
    const row = rec(r);
    return { category: str(row.category), count: num(row.count) };
  });

  const runTotal = num(run.numTotalTests);
  const runPassed = num(run.numPassedTests);
  const runFailed = num(run.numFailedTests);
  const coverageTotals = {
    statements: avgMetric(coverage, "statements"),
    branches: avgMetric(coverage, "branches"),
    functions: avgMetric(coverage, "functions"),
    lines: avgMetric(coverage, "lines"),
  };
  const completenessScoreRaw = num(completeness.score);
  const cmsScoreRaw = num(readiness.score);
  const passRate = runTotal > 0 ? (runPassed / runTotal) * 100 : 0;
  const qualityScore = displayQualityScore({
    qualityScore: firstPositive(num(quality.score)),
    passRate,
    coverage: coverageTotals.lines,
    completeness: completenessScoreRaw,
    cmsReadiness: cmsScoreRaw,
    totalTests: runTotal,
  });
  const qualityGrade = firstPositive(num(quality.score)) && str(quality.grade)
    ? str(quality.grade)
    : gradeFromScore(qualityScore);

  return {
    quality: {
      score: qualityScore,
      grade: qualityGrade,
      label: str(quality.label) || (qualityGrade === "A" || qualityGrade === "B" ? "Strong" : "Needs attention"),
      summary: humanizeTechnicalText(str(quality.summary)),
      byStrategy,
    },
    cms: {
      score: firstPositive(cmsScoreRaw) ?? 1,
      grade: str(readiness.grade) || gradeFromScore(firstPositive(cmsScoreRaw) ?? 1),
      label: str(readiness.label),
      summary: humanizeTechnicalText(str(readiness.summary)),
      fromCms: str(fromCms.displayName, "source CMS"),
      toCms: str(toCms.displayName, "target CMS"),
      stats: {
        filesScanned: num(cmsStats.filesScanned),
        filesWithLegacyRefs: num(cmsStats.filesWithLegacyRefs),
        legacyIssues: num(cmsStats.legacyIssues),
        gapIssues: num(cmsStats.gapIssues),
        progressSignals: num(cmsStats.progressSignals),
      },
      byCategory,
      issues: cmsIssues,
    },
    completeness: {
      score: firstPositive(completenessScoreRaw) ?? 1,
      grade: str(completeness.grade) || gradeFromScore(firstPositive(completenessScoreRaw) ?? 1),
      label: str(completeness.label),
      summary: humanizeTechnicalText(str(completeness.summary)),
      stats: {
        sourcesScanned: num(compStats.sourcesScanned),
        withTests: num(compStats.withTests),
        untested: num(compStats.untested),
        weakCoverage: num(compStats.weakCoverage),
        perfRisks: num(compStats.perfRisks),
        recommendations: num(compStats.recommendations),
        highPriority: num(compStats.highPriority),
      },
      recommendations,
    },
    run: {
      success: typeof run.success === "boolean" ? Boolean(run.success) : runFailed === 0,
      total: runTotal,
      passed: runPassed,
      failed: runFailed,
      pending: num(run.numPendingTests),
      todo: num(run.numTodoTests),
      failedCases,
      testCases,
      testFiles,
    },
    staticIssues,
    coverage,
    coverageTotals,
  };
}

export function gradeTone(grade: string): Tone {
  const g = (grade || "").charAt(0).toUpperCase();
  if (g === "A" || g === "B") return "pass";
  if (g === "C") return "warn";
  return "fail";
}

export function scoreTone(score: number): Tone {
  if (score >= 90) return "pass";
  if (score >= 70) return "warn";
  return "fail";
}

export function countTone(n: number): Tone {
  if (n <= 0) return "pass";
  if (n >= 5) return "fail";
  return "warn";
}
