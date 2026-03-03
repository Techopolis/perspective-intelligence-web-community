import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const publicPaths = ["/", "/login", "/signup", "/forgot-password", "/reset-password"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function buildUrl(request: Request, path: string, query?: string): string {
  const host = request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const url = `${proto}://${host}${path}`;
  return query ? `${url}?${query}` : url;
}

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const pathname = req.nextUrl.pathname;

  // Redirect logged-in users away from root to /chat
  if (pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(buildUrl(req, "/chat"));
  }

  // Public paths — allow everyone
  if (isPublicPath(pathname)) return NextResponse.next();

  // Protected routes — redirect to login
  if (!isLoggedIn) {
    return NextResponse.redirect(
      buildUrl(req, "/login", `redirect=${encodeURIComponent(pathname)}`)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|api/auth).*)",
  ],
};
