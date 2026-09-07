import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiGet } from "@/lib/backend";
import { normalizeClients, normalizeProjects } from "@/lib/api-normalize";
import { loadProjectBoardItems } from "@/lib/load-project-reports";
import { ClientRow } from "@/components/ClientListPanel";
import AdminOverview from "@/components/AdminOverview";
import ProjectsBoard from "@/components/ProjectsBoard";
import PageEnter from "@/components/PageEnter";
import { loadAdminOverview } from "@/lib/load-admin-overview";

export default async function DashboardPage() {
  const session = getSession();
  if (!session) redirect("/login");

  if (session.role === "client") {
    if (session.clientId) redirect(`/dashboard/client/${session.clientId}`);
    const projects = normalizeProjects(await apiGet<unknown>("/projects"));
    const items = await loadProjectBoardItems(projects);

    return (
      <PageEnter>
        <div className="px-5 sm:px-8 py-6">
          <div className="mb-8">
            <div className="text-xs font-mono uppercase tracking-widest text-signal-pass mb-1">Your projects</div>
            <h1 className="font-display text-3xl font-bold">Audit Console</h1>
          </div>
          <ProjectsBoard clientId={projects[0]?.clientId ?? ""} isAdmin={false} items={items} />
        </div>
      </PageEnter>
    );
  }

  const [clients, overview] = await Promise.all([
    apiGet<unknown>("/clients").then(normalizeClients),
    loadAdminOverview(),
  ]);
  const counts = new Map<string, number>();
  for (const p of overview.projects) {
    counts.set(p.clientId, (counts.get(p.clientId) ?? 0) + 1);
  }
  const rows: ClientRow[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    contactEmail: c.contactEmail,
    projectCount: counts.get(c.id) ?? c.projectCount ?? 0,
    status: c.status,
  }));

  return (
    <PageEnter>
      <div className="px-5 sm:px-8 py-6">
        <AdminOverview clients={rows} projects={overview.projects} points={overview.points} />
      </div>
    </PageEnter>
  );
}
