import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncSearchConsoleData } from "@/lib/google";
import { saveUserPreference } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      propertyUrl?: string;
      dateFrom?: string;
      dateTo?: string;
      force?: boolean;
    };

    if (!body.propertyUrl || !body.dateFrom || !body.dateTo) {
      return NextResponse.json(
        { error: "propertyUrl, dateFrom, and dateTo are required" },
        { status: 400 }
      );
    }

    const rows = await syncSearchConsoleData({
      request,
      propertyUrl: body.propertyUrl,
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
      force: body.force
    });

    await saveUserPreference(session.user.id, body.propertyUrl);

    return NextResponse.json({
      ok: true,
      rowCount: rows.length
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Search Console sync failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
