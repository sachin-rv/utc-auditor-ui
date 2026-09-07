import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiGet } from "@/lib/backend";
import { normalizeProjects } from "@/lib/api-normalize";
import { loadProjectBoardItems } from "@/lib/load-project-reports";
import ProjectCard from "@/components/ProjectCard";
import PageEnter from "@/components/PageEnter";
import { emptyStateClass } from "@/lib/ui";
import { clientHomePath } from "@/lib/client-routes";
import Link from "next/link";

export default async function ClientProjectPage({
  params,
}: {
  params: { clientId: string; projectId: string };
}) {
  const session = getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin" && session.clientId !== params.clientId) redirect("/dashboard");

  const isAdmin = session.role === "admin";
  const projects = normalizeProjects(
    await (isAdmin
      ? apiGet<unknown>(`/clients/${params.clientId}/projects`)
      : apiGet<unknown>("/projects"))
  );
  const project = projects.find((p) => p.id === params.projectId);
  if (!project) notFound();

  const [item] = await loadProjectBoardItems([project]);

  return (
    <PageEnter>
      <div>
        <Link
          href={clientHomePath(params.clientId)}
          className="text-xs text-mist hover:text-chalk font-mono mb-4 inline-block hover:-translate-x-0.5 transition-transform"
        >
          ← All projects
        </Link>
        <div className="mb-6">
          <div className="text-xs font-mono uppercase tracking-widest text-signal-pass mb-1">Project</div>
          <h1 className="font-display text-3xl font-bold">{project.name}</h1>
          <div className="text-xs text-mist font-mono mt-1">
            {project.slug}
            {project.branch ? ` · ${project.branch}` : ""}
            {item ? ` · ${item.total} report${item.total === 1 ? "" : "s"}` : ""}
          </div>
        </div>
        {item ? (
          <ProjectCard
            clientId={params.clientId}
            project={item.project}
            isAdmin={isAdmin}
            reports={item.reports}
            total={item.total}
            defaultOpen
          />
        ) : (
          <div className={emptyStateClass}>This project could not be loaded.</div>
        )}
      </div>
    </PageEnter>
  );
}
