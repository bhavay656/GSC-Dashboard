import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listSearchConsoleProperties } from "@/lib/google";
import { getUserPreference } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [properties, preference] = await Promise.all([
    listSearchConsoleProperties(request),
    getUserPreference(session.user.id)
  ]);

  return NextResponse.json({
    properties,
    selectedProperty: preference?.selectedProperty ?? null
  });
}
