export interface ScoreSnapshot {
  timestamp: string;
  score: number;
  passed: number;
  failed: number;
  total: number;
  findings: number;
  coverage: number;
  completeness?: number;
  cmsReadiness?: number;
}

export interface ScoreChange {
  delta: number;
  direction: "up" | "down" | "flat";
  headline: string;
  reasons: string[];
}

export function explainScoreChange(current: ScoreSnapshot, previous: ScoreSnapshot): ScoreChange {
  const delta = current.score - previous.score;
  const direction: ScoreChange["direction"] = delta > 1 ? "up" : delta < -1 ? "down" : "flat";
  const reasons: string[] = [];

  const failedDelta = current.failed - previous.failed;
  if (failedDelta < 0) reasons.push(`Fewer tests failed (${previous.failed} → ${current.failed}).`);
  if (failedDelta > 0) reasons.push(`More tests failed (${previous.failed} → ${current.failed}).`);

  const passDelta = current.passed - previous.passed;
  if (passDelta > 0 && failedDelta <= 0) reasons.push(`More tests passed this run (${previous.passed} → ${current.passed}).`);
  if (passDelta < 0 && failedDelta >= 0) reasons.push(`Fewer tests passed this run (${previous.passed} → ${current.passed}).`);

  const findingsDelta = current.findings - previous.findings;
  if (findingsDelta < 0) reasons.push(`Quality findings went down (${previous.findings} → ${current.findings}).`);
  if (findingsDelta > 0) reasons.push(`Quality findings went up (${previous.findings} → ${current.findings}).`);

  const covDelta = current.coverage - previous.coverage;
  if (covDelta >= 2) reasons.push(`Product coverage improved (${previous.coverage}% → ${current.coverage}%).`);
  if (covDelta <= -2) reasons.push(`Product coverage dropped (${previous.coverage}% → ${current.coverage}%).`);

  if (current.completeness != null && previous.completeness != null) {
    const d = current.completeness - previous.completeness;
    if (d >= 2) reasons.push("More of the product now has automated tests.");
    if (d <= -2) reasons.push("A larger share of the product is missing automated tests.");
  }

  if (current.cmsReadiness != null && previous.cmsReadiness != null) {
    const d = current.cmsReadiness - previous.cmsReadiness;
    if (d >= 2) reasons.push("CMS migration readiness improved.");
    if (d <= -2) reasons.push("CMS migration readiness declined.");
  }

  if (reasons.length === 0) {
    reasons.push("Score movement is small. Test volume and findings are similar to the previous run.");
  }

  const abs = Math.abs(delta);
  const headline =
    direction === "up"
      ? `Quality improved by ${abs} point${abs === 1 ? "" : "s"} since the previous run.`
      : direction === "down"
        ? `Quality declined by ${abs} point${abs === 1 ? "" : "s"} since the previous run.`
        : "Quality is steady compared with the previous run.";

  return { delta, direction, headline, reasons };
}

export function snapshotFromRow(row: {
  timestamp: string;
  overallScore: number;
  passed: number;
  failed?: number;
  total: number;
  findingsCount?: number;
  coverage?: { lines: number };
  coveragePercent?: number | null;
  completenessScore?: number;
  cmsReadiness?: number;
}): ScoreSnapshot {
  return {
    timestamp: row.timestamp,
    score: row.overallScore,
    passed: row.passed,
    failed: row.failed ?? Math.max(0, row.total - row.passed),
    total: row.total,
    findings: row.findingsCount ?? 0,
    coverage: Math.round(row.coverage?.lines ?? row.coveragePercent ?? 0),
    completeness: row.completenessScore,
    cmsReadiness: row.cmsReadiness,
  };
}
