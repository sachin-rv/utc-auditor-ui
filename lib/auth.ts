import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME as SESSION_COOKIE } from "./constants";
import {
  decodeSession,
  encodeSession,
  isAccessTokenExpired,
  type Session,
} from "./session-token";

export type { Session } from "./session-token";
export { decodeSession, encodeSession, isAccessTokenExpired } from "./session-token";

export function getSession(): Session | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = decodeSession(token);
  if (!session) return null;
  if (isAccessTokenExpired(session.accessToken)) return null;
  return session;
}

export function dashboardHome(session: Session) {
  if (session.role === "admin") return "/dashboard";
  if (session.clientId) return `/dashboard/client/${session.clientId}`;
  return "/dashboard";
}

export { SESSION_COOKIE_NAME } from "./constants";
