export function gradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 55) return "D";
  return "D";
}

export function gradeLabel(grade: string): string {
  const g = (grade || "").charAt(0).toUpperCase();
  if (g === "A") return "Excellent";
  if (g === "B") return "Strong";
  if (g === "C") return "Fair";
  if (g === "D") return "Needs attention";
  return "Fair";
}

export function firstPositive(...values: Array<number | null | undefined>): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.round(value);
    }
  }
  return undefined;
}

/** Quality score shown in the UI. Never returns 0. */
export function displayQualityScore(input: {
  qualityScore?: number | null;
  passRate?: number | null;
  coverage?: number | null;
  completeness?: number | null;
  cmsReadiness?: number | null;
  totalTests?: number | null;
}): number {
  const fromLibrary = firstPositive(input.qualityScore);
  if (fromLibrary != null) return Math.min(100, fromLibrary);

  const passRate = clampPct(input.passRate);
  const coverage = clampPct(input.coverage);
  const completeness = clampPct(input.completeness);
  const cms = clampPct(input.cmsReadiness);
  const derived = Math.round(passRate * 0.4 + coverage * 0.3 + completeness * 0.2 + cms * 0.1);
  if (derived > 0) return Math.min(100, derived);
  if ((input.totalTests ?? 0) > 0) return Math.max(coverage, passRate, 1);
  return 1;
}

export function displayPercent(value?: number | null): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
  return n > 0 ? Math.min(100, n) : 1;
}

export function averageScore(scores: number[]): number {
  const usable = scores.filter((s) => Number.isFinite(s) && s > 0);
  if (usable.length === 0) return 1;
  return Math.round(usable.reduce((sum, s) => sum + s, 0) / usable.length);
}

function clampPct(value?: number | null): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}
