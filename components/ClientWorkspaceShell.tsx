"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, LayoutGrid, Users } from "lucide-react";
import { clientHomePath, clientProjectPath } from "@/lib/client-routes";

export type WorkspaceProject = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

const WorkspaceCtx = createContext<{
  clientId: string;
  focusProjectId: string | null;
  setFocusProjectId: (id: string | null) => void;
} | null>(null);

export function useWorkspaceFocus() {
  return useContext(WorkspaceCtx);
}

export function MarkWorkspaceProject({ projectId }: { projectId: string }) {
  const ctx = useWorkspaceFocus();
  const setFocus = ctx?.setFocusProjectId;
  useEffect(() => {
    if (!setFocus) return;
    setFocus(projectId);
  }, [projectId, setFocus]);
  return null;
}

export default function ClientWorkspaceShell({
  clientId,
  clientName,
  isAdmin,
  projects,
  children,
}: {
  clientId: string;
  clientName: string;
  isAdmin: boolean;
  projects: WorkspaceProject[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const pathProjectId = useMemo(() => {
    const match = pathname.match(/\/project\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);
  const [focusProjectId, setFocusProjectId] = useState<string | null>(pathProjectId);
  const setFocus = useCallback((id: string | null) => setFocusProjectId(id), []);
  const activeProjectId = pathProjectId ?? focusProjectId;
  const onOverview = pathname === clientHomePath(clientId);
  const viewingReport = pathname.includes("/report/");

  useEffect(() => {
    if (pathProjectId) setFocusProjectId(pathProjectId);
    if (onOverview && !viewingReport) setFocusProjectId(null);
  }, [onOverview, pathProjectId, viewingReport]);

  const ctx = useMemo(
    () => ({ clientId, focusProjectId: activeProjectId, setFocusProjectId: setFocus }),
    [activeProjectId, clientId, setFocus]
  );

  return (
    <WorkspaceCtx.Provider value={ctx}>
      <div className="flex-1 flex flex-col md:flex-row min-h-0 w-full">
        <aside className="shrink-0 border-b md:border-b-0 md:border-r border-line bg-panel/90 md:sticky md:top-16 md:self-start md:h-[calc(100vh-4rem)] md:w-64 lg:w-72 md:overflow-y-auto">
          <div className="px-4 py-4 md:px-5 md:py-5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-mist mb-1">Workspace</div>
            <div className="font-display font-semibold text-chalk truncate">{clientName}</div>
          </div>

          <nav className="px-3 pb-4 flex md:block gap-2 overflow-x-auto md:overflow-visible">
            {isAdmin && (
              <Link
                href="/dashboard"
                className="hidden md:flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-mist hover:text-signal-pass hover:bg-panel2 mb-1"
              >
                <Users size={16} />
                All clients
              </Link>
            )}
            <NavItem
              href={clientHomePath(clientId)}
              icon={<LayoutGrid size={16} />}
              label="All projects"
              active={onOverview && !viewingReport}
            />
            <div className="hidden md:block text-[10px] font-mono uppercase tracking-widest text-mist px-3 pt-4 pb-2">
              Projects
            </div>
            {projects.length === 0 ? (
              <div className="hidden md:block px-3 py-2 text-xs text-mist">No projects yet.</div>
            ) : (
              projects.map((project) => (
                <NavItem
                  key={project.id}
                  href={clientProjectPath(clientId, project.id)}
                  icon={<FolderKanban size={16} />}
                  label={project.name}
                  hint={project.slug}
                  active={activeProjectId === project.id}
                />
              ))
            )}
          </nav>
        </aside>

        <section className="flex-1 min-w-0 px-5 sm:px-8 py-6">{children}</section>
      </div>
    </WorkspaceCtx.Provider>
  );
}

function NavItem({
  href,
  icon,
  label,
  hint,
  active,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  hint?: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 md:w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-signal-pass/10 text-signal-pass"
          : "text-chalk hover:text-signal-pass hover:bg-panel2"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {hint ? <span className="hidden md:block text-[10px] font-mono text-mist truncate">{hint}</span> : null}
      </span>
    </Link>
  );
}
