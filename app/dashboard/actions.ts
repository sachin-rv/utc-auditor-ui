"use server";

import { revalidatePath } from "next/cache";
import { backendFetch, BackendError, isNextInterrupt } from "@/lib/backend";
import { normalizeCreatedProject, normalizeProject } from "@/lib/api-normalize";
import type {
  ApiClient,
  ApiKeyCreated,
  ApiProject,
  AuthUser,
  CreateProjectInput,
  CreateUserInput,
} from "@/lib/api-types";

function fail(e: unknown, fallback: string) {
  if (isNextInterrupt(e)) throw e;
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
  input: CreateProjectInput,
) {
  try {
    const raw = await backendFetch<ApiProject>(`/clients/${clientId}/projects`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    const data = normalizeCreatedProject(raw);
    if (!data) {
      return { ok: false as const, error: "Project was created but the response could not be read." };
    }
    revalidatePath(`/dashboard/client/${clientId}`);
    revalidatePath("/dashboard");
    return { ok: true as const, data };
  } catch (e) {
    return fail(e, "Failed to create project.");
  }
}

export async function updateProjectAction(projectId: string, input: Partial<{
  name: string;
  repositoryUrl?: string;
  websiteUrl?: string;
  description?: string;
  status?: string;
  auditConfig?: CreateProjectInput['auditConfig'];
}>) {
  try {
    const raw = await backendFetch<ApiProject>(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    const data = normalizeProject(raw);
    if (!data) {
      return { ok: false as const, error: "Project was updated but the response could not be read." };
    }
    revalidatePath("/dashboard");
    if (data.clientId) revalidatePath(`/dashboard/client/${data.clientId}`);
    return { ok: true as const, data };
  } catch (e) {
    return fail(e, "Failed to update project.");
  }
}

export async function deleteProjectAction(projectId: string) {
  try {
    const raw = await backendFetch<unknown>(`/projects/${projectId}`, {
      method: "DELETE",
    });
    const data = normalizeProject(raw);
    if (!data) {
      return { ok: false as const, error: "Project was deactivated but the response could not be read." };
    }
    revalidatePath("/dashboard");
    if (data.clientId) revalidatePath(`/dashboard/client/${data.clientId}`);
    return { ok: true as const, data };
  } catch (e) {
    return fail(e, "Failed to deactivate project.");
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

export async function regenerateApiKeyAction(projectId: string, name?: string) {
  try {
    const body = name?.trim() ? { name: name.trim() } : {};
    const data = await backendFetch<ApiKeyCreated>(`/projects/${projectId}/api-keys/regenerate`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { ok: true as const, data };
  } catch (e) {
    return fail(e, "Failed to rotate API key.");
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
