export const METRIC_HELP: Record<string, string> = {
  Score:
    "Overall suite health from 0–100. Starts at 100, then drops for static findings (errors cost more), failing tests, and low average line coverage.",
  Readiness:
    "CMS migration readiness from 0–100. Separate from Quality Score. Deducts for legacy CMS refs in tests; small bonus when target CMS patterns also appear.",
  Completeness:
    "How completely application source modules are covered by unit tests (0–100). Separate from Quality Score. Deducts for untested pages/APIs/components and weak coverage.",
  Grade:
    "Letter grade from the score: A ≥90, B ≥80, C ≥70, D ≥55, F below 55. Use it as a quick “how healthy is this suite?” signal.",
  "Legacy refs":
    "Number of test files that still reference the source (legacy) CMS via imports, mocks, strings, or fixture paths.",
  Untested:
    "Application source modules with no matching unit test file (by name, folder, or import). Open Missing tests for what to write.",
  "High-risk gaps":
    "High-priority completeness recommendations — usually untested pages/APIs or modules with loading/performance risks.",
  "Quality score":
    "Overall suite health from 0–100. Starts at 100, then drops for static findings (errors cost more), failing tests, and low average line coverage.",
  "CMS readiness":
    "CMS migration readiness from 0–100. Separate from Quality Score. Deducts for legacy CMS refs in tests; small bonus when target CMS patterns also appear.",
  "Test completeness":
    "How completely application source modules are covered by unit tests (0–100). Separate from Quality Score. Deducts for untested pages/APIs/components and weak coverage.",
  "Total tests":
    "Every test Jest registered: passed + failed + pending + todo. That is why Total is often larger than Passed + Failed alone.",
  Passed:
    "Tests that ran and succeeded. Click the card to list them. A high pass count is good only if failures and skips are also under control.",
  Failed:
    "Tests that ran and failed. These usually need a fix before release. Click to see failure messages.",
  Pending:
    "Tests that were intentionally skipped (for example it.skip / xit). They still count in Total, so a “green” suite can hide unfinished work.",
  Todo:
    "Placeholders (test.todo) for work not written yet. They inflate Total without protecting behavior.",
  "Static errors":
    "Serious code-quality findings in test files (for example focused .only tests, empty tests, secrets, unmocked network). Prefer fixing these first.",
  "Static warnings":
    "Important hygiene risks (skips, flakes, weak assertions, Testing Library anti-patterns). Not always blockers, but they erode trust.",
  "Static info":
    "Lower-priority readability and hygiene hints. Useful cleanup, usually not release-blocking.",
};

export const HERO_NOTES = {
  quality: "Total includes pending and todo tests — so Total is not always Passed + Failed.",
  cms: "CMS findings do not change the Quality Score — they are scored separately as migration readiness.",
  completeness: "Jest shows what ran. Completeness shows what is still missing and what to write next.",
} as const;

export type MetricModalKind = "tests" | "failed" | "issues" | "hero";

export const METRIC_MODAL: Record<
  string,
  {
    kind: MetricModalKind;
    title: string;
    sub: string;
    status?: string;
    severity?: string;
    hero?: "quality" | "cms" | "completeness";
    section?: "static" | "failed" | "files" | "cms" | "missing";
  }
> = {
  "Quality score": {
    kind: "hero",
    title: "Quality score",
    sub: HERO_NOTES.quality,
    hero: "quality",
    section: "static",
  },
  "CMS readiness": {
    kind: "hero",
    title: "CMS readiness",
    sub: HERO_NOTES.cms,
    hero: "cms",
    section: "cms",
  },
  "Test completeness": {
    kind: "hero",
    title: "Test completeness",
    sub: HERO_NOTES.completeness,
    hero: "completeness",
    section: "missing",
  },
  "Total tests": {
    kind: "tests",
    title: "All tests",
    sub: "Every test Jest registered in this run.",
    status: "all",
    section: "files",
  },
  Passed: {
    kind: "tests",
    title: "Passed tests",
    sub: "Tests that ran successfully.",
    status: "passed",
    section: "files",
  },
  Failed: {
    kind: "failed",
    title: "Failed tests",
    sub: "Failing tests with captured error output.",
    status: "failed",
    section: "failed",
  },
  Pending: {
    kind: "tests",
    title: "Pending / skipped tests",
    sub: "Skipped tests (it.skip / xit / pending). They count toward Total but do not protect behavior.",
    status: "pending",
    section: "failed",
  },
  Todo: {
    kind: "tests",
    title: "Todo tests",
    sub: "test.todo placeholders — planned tests that are not written yet.",
    status: "todo",
    section: "failed",
  },
  "Static errors": {
    kind: "issues",
    title: "Static analysis — errors",
    sub: "Highest-severity findings in test source. Prefer fixing these first.",
    severity: "error",
    section: "static",
  },
  "Static warnings": {
    kind: "issues",
    title: "Static analysis — warnings",
    sub: "Important hygiene risks that reduce trust in the suite.",
    severity: "warning",
    section: "static",
  },
  "Static info": {
    kind: "issues",
    title: "Static analysis — info",
    sub: "Lower-priority readability and hygiene hints.",
    severity: "info",
    section: "static",
  },
  "Legacy refs": {
    kind: "hero",
    title: "CMS readiness",
    sub: HERO_NOTES.cms,
    hero: "cms",
    section: "cms",
  },
  Untested: {
    kind: "hero",
    title: "Test completeness",
    sub: HERO_NOTES.completeness,
    hero: "completeness",
    section: "missing",
  },
  "High-risk gaps": {
    kind: "hero",
    title: "Test completeness",
    sub: HERO_NOTES.completeness,
    hero: "completeness",
    section: "missing",
  },
};
