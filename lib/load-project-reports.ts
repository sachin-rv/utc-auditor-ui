import { apiGet, isNextInterrupt } from "@/lib/backend";
import { listRowFromApi } from "@/lib/report-map";
import { normalizeReportDetail, normalizeReportsPage } from "@/lib/api-normalize";
import type { ApiProject, ApiReportsPage } from "@/lib/api-types";
import type { ProjectBoardItem } from "@/components/ProjectsBoard";

const LIST_LIMIT = 20;
const HYDRATE_LIMIT = 12;

export async function loadProjectBoardItems(projects: ApiProject[]): Promise<ProjectBoardItem[]> {
  return Promise.all(projects.map((project) => loadOne(project)));
}

export async function loadProjectReports(
  project: ApiProject,
  options?: { hydrate?: boolean; hydrateLimit?: number }
): Promise<ProjectBoardItem> {
  return loadOne(project, options?.hydrate !== false, options?.hydrateLimit ?? HYDRATE_LIMIT);
}

async function loadOne(
  project: ApiProject,
  hydrate = true,
  hydrateLimit = HYDRATE_LIMIT
): Promise<ProjectBoardItem> {
  const raw = await apiGet<ApiReportsPage>(`/projects/${project.id}/reports?page=1&limit=${LIST_LIMIT}`);
  const page = normalizeReportsPage(raw, project);
  const limit = Math.max(0, hydrateLimit);
  const head = hydrate ? page.reports.slice(0, limit) : [];
  const tail = hydrate ? page.reports.slice(limit) : page.reports;
  const hydrated = await Promise.all(
    head.map(async (item, index) => {
      const missingJson = !item.reportJson || Object.keys(item.reportJson).length === 0;
      if (!missingJson) return item;
      if (index > 0 && item.summary?.auditScore != null && item.summary.totalTests != null) return item;
      try {
        const detail = await apiGet<unknown>(`/reports/${item.id}`);
        return normalizeReportDetail(detail) ?? item;
      } catch (e) {
        if (isNextInterrupt(e)) throw e;
        return item;
      }
    })
  );
  const reports = [...hydrated, ...tail].map(listRowFromApi);
  const mergedProject = {
    ...project,
    ...(page.project.id ? page.project : {}),
    clientId: page.project.clientId || project.clientId,
    name: page.project.name && page.project.name !== "Project" ? page.project.name : project.name,
  };
  return { project: mergedProject, reports, total: page.total ?? reports.length };
}
