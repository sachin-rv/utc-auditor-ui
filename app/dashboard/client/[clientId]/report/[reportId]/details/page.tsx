import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { apiGet, backendFetch } from "@/lib/backend";
import { detailView } from "@/lib/report-map";
import { parseUserReport } from "@/lib/user-report";
import type { ApiProject, ApiReportDetail } from "@/lib/api-types";
import CopyLinkButton from "@/components/CopyLinkButton";
import AuditDetailsDashboard from "@/components/AuditDetailsDashboard";
import PageEnter from "@/components/PageEnter";
import { MarkWorkspaceProject } from "@/components/ClientWorkspaceShell";
import { clientReportPath } from "@/lib/client-routes";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function ReportDetailedQualityPage({
  params,
}: {
  params: { clientId: string; reportId: string };
}) {
  const session = getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin" && session.clientId !== params.clientId) redirect("/dashboard");

  const report = await apiGet<ApiReportDetail>(`/reports/${params.reportId}`);
  if (report.clientId !== params.clientId) notFound();

  const view = detailView(report);
  const dashboard = parseUserReport(report.reportJson);
  if (!dashboard) notFound();

  const project = await backendFetch<ApiProject>(`/projects/${report.projectId}`).catch(() => null);

  return (
    <PageEnter>
    <div>
      <MarkWorkspaceProject projectId={report.projectId} />
      <Link
        href={clientReportPath(params.clientId, report.id)}
        className="text-xs text-mist hover:text-chalk font-mono mb-4 inline-block hover:-translate-x-0.5 transition-transform"
      >
        ← Back to audit report
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-signal-pass mb-1">
            Detailed test-quality breakdown
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold">{project?.name ?? "Project"}</h1>
            <CopyLinkButton />
          </div>
          <div className="text-sm text-mist mt-1">{fmtDateTime(view.timestamp)}</div>
        </div>
      </div>

      <AuditDetailsDashboard data={dashboard} />
    </div>
    </PageEnter>
  );
}
