import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveUserPreference } from "@/lib/dashboard";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { propertyUrl?: string };

  if (!body.propertyUrl) {
    return NextResponse.json({ error: "propertyUrl is required" }, { status: 400 });
  }

  await saveUserPreference(session.user.id, body.propertyUrl);

  return NextResponse.json({ ok: true });
}
