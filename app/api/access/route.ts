import { NextRequest, NextResponse } from "next/server";
import { createAccessProof, getAccessCookieName } from "@/lib/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/");
  const expectedPassword = process.env.DASHBOARD_ACCESS_PASSWORD;
  const secret = process.env.NEXTAUTH_SECRET;

  if (!expectedPassword || !secret) {
    return NextResponse.redirect(new URL(returnTo || "/", request.url));
  }

  if (password !== expectedPassword) {
    const url = new URL("/access", request.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("returnTo", returnTo || "/");
    return NextResponse.redirect(url);
  }

  const response = NextResponse.redirect(new URL(returnTo || "/", request.url));
  const proof = await createAccessProof(expectedPassword, secret);

  response.cookies.set({
    name: getAccessCookieName(),
    value: proof,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 12
  });

  return response;
}
