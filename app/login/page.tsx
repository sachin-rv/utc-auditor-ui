"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import InteractivePreview from "@/components/login-preview/InteractivePreview";
import PasswordField from "@/components/PasswordField";
import PageLoader from "@/components/PageLoader";
import { fieldClass } from "@/lib/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    fetch("/api/auth/setup-status")
      .then((r) => r.json())
      .then((d) => setSetupRequired(!!d.setupRequired))
      .catch(() => setSetupRequired(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const url = setupRequired ? "/api/auth/setup" : "/api/auth/login";
    const body = setupRequired ? { email, password, name } : { email, password };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Sign in failed.");
      return;
    }
    const dest =
      data.role === "admin"
        ? "/dashboard"
        : data.clientId
          ? `/dashboard/client/${data.clientId}`
          : "/";
    router.replace(dest);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="relative w-full max-w-5xl bg-panel rounded-2xl md:rounded-3xl border border-line shadow-xl shadow-black/5 dark:shadow-black/40 overflow-hidden flex flex-col md:flex-row md:min-h-[640px]">
        {loading && (
          <div className="absolute inset-0 z-20 bg-panel/80 backdrop-blur-sm flex items-center justify-center">
            <PageLoader
              label={setupRequired ? "Creating your account…" : "Signing you in…"}
            />
          </div>
        )}
        <div className="flex-1 flex flex-col p-8 sm:p-10 md:p-12 relative">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="font-display font-bold text-lg text-chalk tracking-tight">
                UTC Auditor
              </span>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
            <div className="text-center mb-6">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-chalk mb-1.5">
                {setupRequired ? "Create Your Account" : "Welcome Back"}
              </h1>
              <p className="text-sm text-mist leading-relaxed">
                {setupRequired
                  ? "Set up the first admin account to get started."
                  : "Enter your email and password to access your account."}
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-3.5">
              {setupRequired && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-chalk mb-1">
                    Name
                  </label>
                  <input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldClass}
                    placeholder="Admin User"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-chalk mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                  placeholder="email@company.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-chalk mb-1">
                  Password
                </label>
                <PasswordField
                  id="password"
                  required
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggleShow={() => setShowPassword((v) => !v)}
                />
              </div>

              {!setupRequired && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-line text-signal-pass focus:ring-signal-pass/30"
                    />
                    <span className="text-sm text-mist">Remember Me</span>
                  </label>
                  <a
                    href="#"
                    className="text-sm font-medium text-signal-pass hover:brightness-110 transition"
                    onClick={(e) => e.preventDefault()}
                  >
                    Forgot Your Password?
                  </a>
                </div>
              )}

              {error && (
                <div className="text-sm text-signal-fail bg-signal-fail/10 border border-signal-fail/20 rounded-xl px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-chalk dark:bg-signal-pass text-panel dark:text-onaccent hover:opacity-90 font-semibold text-sm rounded-full py-2.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? setupRequired
                    ? "Creating…"
                    : "Signing in…"
                  : setupRequired
                    ? "Create admin"
                    : "Log in"}
              </button>
            </form>
          </div>

          <p className="text-[11px] text-mist mt-8 md:mt-0 md:absolute md:bottom-8 md:left-10 lg:left-12">
            Copyright © 2026 UTC Auditor. All rights reserved.
          </p>
        </div>

        <InteractivePreview />
      </div>
    </div>
  );
}
