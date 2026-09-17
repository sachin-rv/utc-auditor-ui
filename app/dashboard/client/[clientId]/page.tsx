import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiGet } from "@/lib/backend";
import { normalizeClient, normalizeProjects } from "@/lib/api-normalize";
import { loadProjectBoardItems } from "@/lib/load-project-reports";
import CreateProjectButton from "@/components/CreateProjectButton";
import CreateUserButton from "@/components/CreateUserButton";
import ProjectsBoard from "@/components/ProjectsBoard";
import PageEnter from "@/components/PageEnter";
import { emptyStateClass } from "@/lib/ui";

export default async function ClientProjectsPage({ params }: { params: { clientId: string } }) {
  const session = getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin" && session.clientId !== params.clientId) redirect("/dashboard");

  const isAdmin = session.role === "admin";
  const [clientRaw, projectsRaw] = await Promise.all([
    isAdmin ? apiGet<unknown>(`/clients/${params.clientId}`) : Promise.resolve(null),
    isAdmin ? apiGet<unknown>(`/clients/${params.clientId}/projects`) : apiGet<unknown>("/projects"),
  ]);

  const client = clientRaw ? normalizeClient(clientRaw) : null;
  if (isAdmin && !client) notFound();

  const projects = normalizeProjects(projectsRaw);
  const items = await loadProjectBoardItems(projects);
  const title = client?.name ?? session.name ?? "Projects";
  const reportCount = items.reduce((n, item) => n + item.total, 0);
  const latestScore = items
    .map((item) => item.reports[0]?.overallScore)
    .filter((n): n is number => typeof n === "number" && n > 0)
    .sort((a, b) => b - a)[0];

  return (
    <PageEnter>
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-signal-pass mb-1">
            {isAdmin ? "Client" : "Your projects"}
          </div>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          {client && (
            <div className="text-xs text-mist font-mono mt-1">
              {client.slug}
              {client.contactEmail ? ` · ${client.contactEmail}` : ""}
              {client.status ? ` · ${client.status}` : ""}
            </div>
          )}
          <div className="text-xs text-mist font-mono mt-1">
            {projects.length} project{projects.length === 1 ? "" : "s"} · {reportCount} report
            {reportCount === 1 ? "" : "s"}
            {latestScore != null ? ` · latest score ${latestScore}` : ""}
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <CreateUserButton defaultClientId={params.clientId} />
            <CreateProjectButton clientId={params.clientId} />
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <div className={emptyStateClass}>
          No projects yet{isAdmin ? " — add one to start collecting reports." : "."}
        </div>
      ) : (
        <ProjectsBoard clientId={params.clientId} isAdmin={isAdmin} items={items} />
      )}
    </div>
    </PageEnter>
  );
}
