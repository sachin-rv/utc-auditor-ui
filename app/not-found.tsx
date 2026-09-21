import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-panel/90">
        <div className="px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display font-bold tracking-tight text-lg">
              UTC Auditor
            </span>
          </Link>

          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-20">
        <div className="text-center">
          <div className="text-signal-pass font-mono text-sm uppercase tracking-widest mb-4">
            Error 404
          </div>

          <h1 className="font-display text-4xl font-bold mb-4">
            Page not found
          </h1>

          <p className="text-mist text-sm max-w-md mb-8">
            The page you are looking for does not exist or may have been moved.
          </p>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full px-4 py-2 bg-chalk text-panel font-semibold text-sm hover:opacity-90 transition"
          >
            Return home
          </Link>
        </div>
      </main>

      <footer className="border-t border-line py-5">
        <div className="px-5 sm:px-8 text-[11px] text-mist">
          Copyright © 2026 UTC Auditor. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
