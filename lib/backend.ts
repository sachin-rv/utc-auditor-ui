import { redirect, notFound } from "next/navigation";
import { getSession } from "./auth";

export function getBackendUrl() {
  return (process.env.BACKEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export class BackendError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "BackendError";
  }
}

export function messageFromBody(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    const rec = body as { message?: unknown; error?: unknown };
    if (typeof rec.message === "string") return rec.message;
    if (Array.isArray(rec.message)) return rec.message.map(String).join(", ");
    if (typeof rec.error === "string") return rec.error;
  }
  return fallback;
}

async function parseJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(url: string, init?: RequestInit) {
  try {
    return await fetch(url, init);
  } catch {
    throw new BackendError(502, "Cannot reach the UTC Auditor API. Is the backend running?");
  }
}

export async function backendPublic<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await request(`${getBackendUrl()}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new BackendError(res.status, messageFromBody(body, res.statusText), body);
  }
  return body as T;
}

export async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  if (!session?.accessToken) {
    throw new BackendError(401, "Unauthenticated.");
  }
  const res = await request(`${getBackendUrl()}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await parseJson(res);
  if (!res.ok) {
    if (res.status === 401) {
      redirect("/api/auth/expired");
    }
    throw new BackendError(res.status, messageFromBody(body, res.statusText), body);
  }
  return body as T;
}

export function isNextInterrupt(e: unknown): boolean {
  if (!e || typeof e !== "object" || !("digest" in e)) return false;
  const digest = String((e as { digest?: unknown }).digest ?? "");
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
}

export async function apiGet<T>(path: string): Promise<T> {
  try {
    return await backendFetch<T>(path);
  } catch (e) {
    if (e instanceof BackendError) {
      if (e.status === 401) redirect("/api/auth/expired");
      if (e.status === 404) notFound();
    }
    throw e;
  }
}

export async function backendFetchOptional<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await backendFetch<T>(path, init);
  } catch (e) {
    if (isNextInterrupt(e)) throw e;
    return null;
  }
}
