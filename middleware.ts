import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAccessProof, getAccessCookieName } from "@/lib/access";

function isExcludedPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/access") ||
    pathname.startsWith("/api/access") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  );
}

export async function middleware(request: NextRequest) {
  const accessPassword = process.env.DASHBOARD_ACCESS_PASSWORD;
  const secret = process.env.NEXTAUTH_SECRET;

  if (!accessPassword || !secret || isExcludedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(getAccessCookieName())?.value;
  const expected = await createAccessProof(accessPassword, secret);

  if (cookie === expected) {
    return NextResponse.next();
  }

  const url = new URL("/access", request.url);
  url.searchParams.set(
    "returnTo",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
