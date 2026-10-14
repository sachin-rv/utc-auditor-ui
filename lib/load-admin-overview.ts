import { backendFetch } from "@/lib/backend";
import { normalizeProjects, rec } from "@/lib/api-normalize";
import type { ApiProject } from "@/lib/api-types";

export type OverviewReportPoint = {
  clientId: string;
  projectId: string;
  generatedAt: string;
  score: number | null;
  coverage: number | null;
  passed: boolean;
};

export type AdminOverviewData = {
  projects: ApiProject[];
  points: OverviewReportPoint[];
};

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function loadAdminOverview(): Promise<AdminOverviewData> {
  const raw = await backendFetch<unknown>("/overview");
  const body = rec(raw);
  const projects = normalizeProjects(body.projects ?? []);
  const points = (Array.isArray(body.points) ? body.points : []).map((row) => {
    const point = rec(row);
    return {
      clientId: String(point.clientId ?? ""),
      projectId: String(point.projectId ?? ""),
      generatedAt: String(point.generatedAt ?? ""),
      score: num(point.score),
      coverage: num(point.coverage),
      passed: point.passed === true,
    } satisfies OverviewReportPoint;
  });
  return { projects, points };
}
