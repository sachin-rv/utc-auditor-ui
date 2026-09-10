import type {
  ApiClient,
  ApiProject,
  ApiReportDetail,
  ApiReportListItem,
  ApiReportsPage,
  AuditEnvironmentType,
  AuditSchedule,
} from "./api-types";

export function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function asArray<T>(raw: unknown, keys: string[] = ["items", "data", "results"]): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const obj = rec(raw);
  for (const key of keys) {
    const node = obj[key];
    if (Array.isArray(node)) return node as T[];
    const nested = rec(node);
    if (Array.isArray(nested.items)) return nested.items as T[];
    if (Array.isArray(nested.data)) return nested.data as T[];
  }
  return [];
}

function unwrapEntity(raw: unknown, nestedKey: string): Record<string, unknown> {
  const r = rec(raw);
  if (r.id || r._id) return r;
  const data = rec(r.data);
  if (data.id || data._id) return data;
  const nested = rec(data[nestedKey] ?? r[nestedKey]);
  if (nested.id || nested._id) return nested;
  return r;
}

export function normalizeClient(raw: unknown): ApiClient | null {
  const r = unwrapEntity(raw, "client");
  const id = String(r.id ?? r._id ?? "");
  if (!id) return null;
  return {
    id,
    name: String(r.name ?? "Client"),
    slug: String(r.slug ?? ""),
    contactEmail: String(r.contactEmail ?? r.email ?? ""),
    status: String(r.status ?? "active"),
    projectCount: typeof r.projectCount === "number" ? r.projectCount : undefined,
  };
}

export function normalizeClients(raw: unknown): ApiClient[] {
  return asArray(raw, ["clients", "items", "data", "results"])
    .map(normalizeClient)
    .filter((c): c is ApiClient => Boolean(c));
}

function normalizeAuditConfig(value: unknown): ApiProject["auditConfig"] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const audit = rec(item);

        const envType = String(audit.envType ?? "");
        const branch = String(audit.branch ?? "").trim();

        if (!envType || !branch) {
          return null;
        }

        return {
          envType: envType as AuditEnvironmentType,
          branch,
          schedule: String(audit.schedule ?? "daily") as AuditSchedule,
          minCoverageThreshold:
            typeof audit.minCoverageThreshold === "number"
              ? audit.minCoverageThreshold
              : 80,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  return undefined;
}

export function normalizeProject(raw: unknown): ApiProject | null {
  const r = unwrapEntity(raw, "project");
  const id = String(r.id ?? r._id ?? "");

  if (!id) {
    return null;
  }

  return {
    id,
    clientId: String(r.clientId ?? r.client_id ?? ""),
    name: String(r.name ?? "Project"),
    slug: String(r.slug ?? ""),
    repositoryUrl: r.repositoryUrl
      ? String(r.repositoryUrl)
      : r.repo
        ? String(r.repo)
        : undefined,
    websiteUrl: r.websiteUrl ? String(r.websiteUrl) : undefined,
    branch: r.branch ? String(r.branch) : undefined,
    status: String(r.status ?? "active"),
    description: r.description ? String(r.description) : undefined,
    auditConfig: normalizeAuditConfig(r.auditConfig),
  };
}

export function normalizeProjects(raw: unknown): ApiProject[] {
  return asArray(raw, ["projects", "items", "data", "results"])
    .map(normalizeProject)
    .filter((p): p is ApiProject => Boolean(p));
}

export function normalizeReportListItem(raw: unknown): ApiReportListItem | null {
  const r = unwrapEntity(raw, "report");
  const id = String(r.id ?? r._id ?? "");
  if (!id) return null;
  const summary = rec(r.summary);
  const pipeline = rec(r.pipeline);
  const reportJson = rec(r.reportJson);
  const generatedAt = String(
    r.generatedAt ?? r.receivedAt ?? r.timestamp ?? r.createdAt ?? r.updatedAt ?? ""
  );
  return {
    id,
    reportId: String(r.reportId ?? r.libraryReportId ?? id),
    generatedAt,
    receivedAt: r.receivedAt ? String(r.receivedAt) : undefined,
    projectId: r.projectId ? String(r.projectId) : undefined,
    clientId: r.clientId ? String(r.clientId) : undefined,
    reportJson: Object.keys(reportJson).length ? reportJson : undefined,
    summary: Object.keys(summary).length
      ? {
          totalTests: num(summary.totalTests ?? summary.total),
          passedTests: num(summary.passedTests ?? summary.passed),
          failedTests: num(summary.failedTests ?? summary.failed),
          coveragePercent: num(summary.coveragePercent ?? summary.coverage),
          auditScore: num(summary.auditScore ?? summary.overallScore ?? summary.score ?? summary.qualityScore),
          status: summary.status ? String(summary.status) : undefined,
        }
      : undefined,
    pipeline: Object.keys(pipeline).length
      ? {
          provider: pipeline.provider ? String(pipeline.provider) : undefined,
          runId: pipeline.runId ? String(pipeline.runId) : undefined,
          commitSha: pipeline.commitSha ? String(pipeline.commitSha) : undefined,
          branch: pipeline.branch ? String(pipeline.branch) : undefined,
          triggeredBy: pipeline.triggeredBy ? String(pipeline.triggeredBy) : undefined,
        }
      : undefined,
  };
}

export function normalizeReportsPage(raw: unknown, fallbackProject?: ApiProject): ApiReportsPage {
  const obj = rec(raw);
  const nested = rec(obj.data);
  const reportsRaw =
    (Array.isArray(obj.reports) && obj.reports) ||
    (Array.isArray(obj.items) && obj.items) ||
    (Array.isArray(obj.data) && obj.data) ||
    (Array.isArray(nested.reports) && nested.reports) ||
    (Array.isArray(nested.items) && nested.items) ||
    (Array.isArray(raw) ? raw : []);
  const reports = (reportsRaw as unknown[])
    .map(normalizeReportListItem)
    .filter((r): r is ApiReportListItem => Boolean(r))
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  const project = normalizeProject(obj.project ?? nested.project) ?? fallbackProject;
  const total = num(obj.total ?? nested.total) ?? reports.length;
  return {
    project: project ?? {
      id: "",
      clientId: "",
      name: "Project",
      slug: "",
      status: "active",
    },
    reports,
    total,
    page: num(obj.page ?? nested.page) ?? 1,
    limit: num(obj.limit ?? nested.limit) ?? reports.length,
  };
}

export function normalizeReportDetail(raw: unknown): ApiReportDetail | null {
  const src = unwrapEntity(raw, "report");
  const item = normalizeReportListItem(src);
  if (!item) return null;
  const nestedJson = rec(src.reportJson);
  const payload = rec(src.payload);
  const reportJson =
    Object.keys(nestedJson).length
      ? nestedJson
      : Object.keys(payload).length
        ? payload
        : rec(src.json);
  return {
    ...item,
    projectId: String(src.projectId ?? item.projectId ?? ""),
    clientId: String(src.clientId ?? item.clientId ?? ""),
    reportJson,
    receivedAt: String(src.receivedAt ?? item.generatedAt),
  };
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}
