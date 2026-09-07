import { backendFetch } from "@/lib/backend";
import { normalizeProjects, normalizeReportsPage } from "@/lib/api-normalize";
import type { ApiProject } from "@/lib/api-types";

const PROJECT_CAP = 24;
const REPORTS_PER_PROJECT = 20;

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

export async function loadAdminOverview(): Promise<AdminOverviewData> {
  let projects: ApiProject[] = [];
  try {
    projects = normalizeProjects(await backendFetch<unknown>("/projects"));
  } catch {
    projects = [];
  }

  const sample = projects.slice(0, PROJECT_CAP);
  const batches = await Promise.all(
    sample.map(async (project) => {
      try {
        const raw = await backendFetch<unknown>(
          `/projects/${project.id}/reports?page=1&limit=${REPORTS_PER_PROJECT}`
        );
        const page = normalizeReportsPage(raw, project);
        return page.reports.map((report) => {
          const status = (report.summary?.status ?? "").toLowerCase();
          const score = report.summary?.auditScore ?? null;
          return {
            clientId: project.clientId || report.clientId || "",
            projectId: project.id,
            generatedAt: report.generatedAt,
            score,
            coverage: report.summary?.coveragePercent ?? null,
            passed: status === "pass" || status === "success" || (typeof score === "number" && score >= 80),
          } satisfies OverviewReportPoint;
        });
      } catch {
        return [] as OverviewReportPoint[];
      }
    })
  );

  return { projects, points: batches.flat() };
}
