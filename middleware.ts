import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { isSessionCookieUsable } from "@/lib/session-token";

function redirectToLogin(req: NextRequest, clearCookie: boolean) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  const res = NextResponse.redirect(url);
  if (clearCookie) {
    res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  }
  return res;
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return redirectToLogin(req, false);
  }
  if (!isSessionCookieUsable(token)) {
    return redirectToLogin(req, true);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
