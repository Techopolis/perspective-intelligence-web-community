import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isValidJwtStructure(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

const publicPaths = ["/", "/login", "/signup"];

const alwaysAllowedPaths = ["/_next", "/favicon.ico", "/api"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (alwaysAllowedPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (
    publicPaths.some(
      (path) => pathname === path || pathname.startsWith(path + "/")
    )
  ) {
    if (pathname === "/") {
      const authSession = request.cookies.get("__session");
      if (authSession && isValidJwtStructure(authSession.value)) {
        return NextResponse.redirect(new URL("/chat", request.url));
      }
    }
    return NextResponse.next();
  }

  const authSession = request.cookies.get("__session");

  if (!authSession || !isValidJwtStructure(authSession.value)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
