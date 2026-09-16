import { apiGet } from "@/lib/backend";
import { listRowFromApi } from "@/lib/report-map";
import { normalizeReportDetail, normalizeReportsPage } from "@/lib/api-normalize";
import type { ApiProject } from "@/lib/api-types";
import type { ProjectBoardItem } from "@/components/ProjectsBoard";

const LIST_LIMIT = 50;
const HYDRATE_LIMIT = 12;

export async function loadProjectBoardItems(projects: ApiProject[]): Promise<ProjectBoardItem[]> {
  return Promise.all(projects.map(loadOne));
}

export async function loadProjectReports(project: ApiProject): Promise<ProjectBoardItem> {
  return loadOne(project);
}

async function loadOne(project: ApiProject): Promise<ProjectBoardItem> {
  const raw = await apiGet<unknown>(`/projects/${project.id}/reports?page=1&limit=${LIST_LIMIT}`);
  const page = normalizeReportsPage(raw, project);
  const head = page.reports.slice(0, HYDRATE_LIMIT);
  const tail = page.reports.slice(HYDRATE_LIMIT);
  const hydrated = await Promise.all(
    head.map(async (item, index) => {
      const missingJson = !item.reportJson || Object.keys(item.reportJson).length === 0;
      if (!missingJson) return item;
      if (index > 0 && item.summary?.auditScore != null && item.summary.totalTests != null) return item;
      try {
        const detail = await apiGet<unknown>(`/reports/${item.id}`);
        return normalizeReportDetail(detail) ?? item;
      } catch {
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
