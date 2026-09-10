"use server";

import { revalidatePath } from "next/cache";
import { backendFetch, BackendError } from "@/lib/backend";
import type { ApiClient, ApiKeyCreated, ApiProject, AuthUser, CreateUserInput } from "@/lib/api-types";

function fail(e: unknown, fallback: string) {
  return { ok: false as const, error: e instanceof BackendError ? e.message : fallback };
}

export async function createClientAction(input: {
  name: string;
  slug: string;
  contactEmail?: string;
  user?: { email: string; password: string; name: string };
}) {
  try {
    const data = await backendFetch<ApiClient>("/clients", {
      method: "POST",
      body: JSON.stringify(input),
    });
    revalidatePath("/dashboard");
    return { ok: true as const, data };
  } catch (e) {
    return fail(e, "Failed to create client.");
  }
}

export async function createProjectAction(
  clientId: string,
  input: {
    name: string;
    slug: string;
    repositoryUrl?: string;
    websiteUrl?: string;
    description?: string;
    // auditConfig is an array of env/branch configs
    auditConfig?: { envType: string; branch: string; schedule?: string; minCoverageThreshold?: number }[];
  }
) {
  try {
    const data = await backendFetch<ApiProject>(`/clients/${clientId}/projects`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    revalidatePath(`/dashboard/client/${clientId}`);
    revalidatePath("/dashboard");
    return { ok: true as const, data };
  } catch (e) {
    return fail(e, "Failed to create project.");
  }
}

export async function updateProjectAction(projectId: string, input: Partial<{
  name: string;
  slug: string;
  repositoryUrl?: string;
  websiteUrl?: string;
  description?: string;
  status?: string;
  auditConfig?: { envType: string; branch: string; schedule?: string; minCoverageThreshold?: number }[];
}>) {
  try {
    const data = await backendFetch(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    // best-effort revalidation
    revalidatePath(`/dashboard`);
    revalidatePath(`/dashboard/client`);
    return { ok: true as const, data };
  } catch (e) {
    return fail(e, "Failed to update project.");
  }
}

export async function createApiKeyAction(projectId: string, name: string) {
  try {
    const data = await backendFetch<ApiKeyCreated>(`/projects/${projectId}/api-keys`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    return { ok: true as const, data };
  } catch (e) {
    return fail(e, "Failed to create API key.");
  }
}

export async function createUserAction(input: CreateUserInput) {
  try {
    const body: CreateUserInput = {
      email: input.email,
      password: input.password,
      name: input.name,
      role: input.role,
    };
    if (input.role === "client" && input.clientId) {
      body.clientId = input.clientId;
    }
    const data = await backendFetch<AuthUser>("/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
    revalidatePath("/dashboard");
    if (data.clientId) revalidatePath(`/dashboard/client/${data.clientId}`);
    return { ok: true as const, data };
  } catch (e) {
    return fail(e, "Failed to create user.");
  }
}
