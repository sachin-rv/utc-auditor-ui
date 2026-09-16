import type { UserRole } from "./api-types";

export interface Session {
  accessToken: string;
  userId: string;
  role: UserRole;
  clientId?: string;
  name: string;
  email: string;
}

export function encodeSession(session: Session): string {
  return Buffer.from(JSON.stringify(session)).toString("base64url");
}

export function decodeSession(token: string): Session | null {
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf-8")) as Session;
    if (!parsed?.accessToken || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** True when the JWT `exp` claim is missing-parseable as expired. Non-JWTs return false. */
export function isAccessTokenExpired(accessToken: string, skewMs = 15_000): boolean {
  const parts = accessToken.split(".");
  if (parts.length < 2) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8")) as {
      exp?: unknown;
    };
    if (typeof payload.exp !== "number") return false;
    return Date.now() >= payload.exp * 1000 - skewMs;
  } catch {
    return false;
  }
}

export function isSessionCookieUsable(raw: string | undefined): boolean {
  if (!raw) return false;
  const session = decodeSession(raw);
  if (!session) return false;
  return !isAccessTokenExpired(session.accessToken);
}
