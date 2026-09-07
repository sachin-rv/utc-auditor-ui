import type { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiGet } from "@/lib/backend";
import { normalizeClient, normalizeProjects } from "@/lib/api-normalize";
import ClientWorkspaceShell from "@/components/ClientWorkspaceShell";

export default async function ClientWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { clientId: string };
}) {
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

  const projects = normalizeProjects(projectsRaw).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    status: p.status,
  }));

  return (
    <ClientWorkspaceShell
      clientId={params.clientId}
      clientName={client?.name ?? session.name ?? "Workspace"}
      isAdmin={isAdmin}
      projects={projects}
    >
      {children}
    </ClientWorkspaceShell>
  );
}
