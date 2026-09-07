import Link from "next/link";
import { redirect } from "next/navigation";
import { dashboardHome, getSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-panel/90 backdrop-blur-xl">
        <div className="px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href={dashboardHome(session)} className="flex items-center gap-2.5 group">
            <span className="transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[-4deg]">
              <Logo />
            </span>
            <span className="font-display font-bold tracking-tight text-lg text-chalk">
              UTC Auditor
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right leading-tight hidden sm:block">
              <div className="text-sm font-medium">{session.name}</div>
              <div className="text-[11px] text-mist uppercase tracking-wider">
                {session.role === "admin" ? "Administrator" : "Client user"}
              </div>
            </div>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 w-full flex flex-col min-h-0">{children}</main>
      <footer className="border-t border-line py-5">
        <div className="px-5 sm:px-8 text-[11px] text-mist">
          Copyright © 2026 UTC Auditor. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
