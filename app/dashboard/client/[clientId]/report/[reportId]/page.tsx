import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiGet, backendFetch } from "@/lib/backend";
import { detailView } from "@/lib/report-map";
import type { ApiProject, ApiReportDetail } from "@/lib/api-types";
import ReportView from "@/components/ReportView";
import { MarkWorkspaceProject } from "@/components/ClientWorkspaceShell";

export default async function ReportDetailPage({
  params,
}: {
  params: { clientId: string; reportId: string };
}) {
  const session = getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin" && session.clientId !== params.clientId) redirect("/dashboard");

  const report = await apiGet<ApiReportDetail>(`/reports/${params.reportId}`);
  if (report.clientId !== params.clientId) notFound();

  const project = await backendFetch<ApiProject>(`/projects/${report.projectId}`).catch(() => null);
  const view = detailView(report);

  return (
    <>
      <MarkWorkspaceProject projectId={report.projectId} />
      <ReportView
        projectName={project?.name ?? "Project"}
        view={{
          id: view.id,
          reportId: view.reportId,
          clientId: view.clientId,
          projectId: report.projectId,
          timestamp: view.timestamp,
          overallScore: view.overallScore,
          coverage: view.coverage,
          testExecution: {
            total: view.testExecution.total,
            passed: view.testExecution.passed,
            failed: view.testExecution.failed,
          },
          findings: view.findings,
          status: view.status,
          pipeline: view.pipeline,
          hasDetailed: view.hasDetailed,
          rawJson: view.rawJson,
        }}
      />
    </>
  );
}
