import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

/** Clears the session cookie then sends the user to login. Used when the JWT is rejected. */
export async function GET(req: NextRequest) {
  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.searchParams.set("reason", "session");
  const res = NextResponse.redirect(login);
  res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
