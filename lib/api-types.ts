export type UserRole = "admin" | "client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clientId: string | null;
  isActive: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface ApiClient {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  status: string;
  projectCount?: number;
}

export interface ApiProject {
  id: string;
  clientId: string;
  name: string;
  slug: string;
  repositoryUrl?: string;
  websiteUrl?: string;
  branch?: string;
  status: string;
  description?: string;
  // backend may return either a single auditConfig object (legacy) or an array of audit entries
  auditConfig?:
    | {
        schedule?: string;
        minCoverageThreshold?: number;
      }
    | {
        envType: string;
        branch: string;
        schedule?: string;
        minCoverageThreshold?: number;
      }[];
}

export interface ReportSummary {
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
  coveragePercent?: number;
  auditScore?: number;
  status?: "pass" | "fail" | "warning" | string;
}

export interface ReportPipeline {
  provider?: string;
  runId?: string;
  commitSha?: string;
  branch?: string;
  triggeredBy?: string;
}

export interface ApiReportListItem {
  id: string;
  reportId: string;
  summary?: ReportSummary;
  generatedAt: string;
  pipeline?: ReportPipeline;
  reportJson?: Record<string, unknown>;
  projectId?: string;
  clientId?: string;
  receivedAt?: string;
}

export interface ApiReportsPage {
  project: ApiProject;
  reports: ApiReportListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiReportDetail extends ApiReportListItem {
  projectId: string;
  clientId: string;
  reportJson: Record<string, unknown>;
  receivedAt: string;
}

export interface ApiKeyCreated {
  id: string;
  projectId: string;
  name: string;
  keyPrefix: string;
  plainKey: string;
  message: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  clientId?: string;
}
