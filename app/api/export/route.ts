import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardData, toCsv } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const propertyUrl = searchParams.get("propertyUrl");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (!propertyUrl || !dateFrom || !dateTo) {
    return new Response("Missing required query params", { status: 400 });
  }

  const minPosition = searchParams.get("minPosition");
  const maxPosition = searchParams.get("maxPosition");

  const data = await getDashboardData({
    userId: session.user.id,
    propertyUrl,
    dateFrom,
    dateTo,
    filters: {
      intent: searchParams.get("intent") ?? undefined,
      product: searchParams.get("product") ?? undefined,
      keywordContains: searchParams.get("keywordContains") ?? undefined,
      pageContains: searchParams.get("pageContains") ?? undefined,
      minPosition: minPosition ? Number(minPosition) : undefined,
      maxPosition: maxPosition ? Number(maxPosition) : undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortDirection:
        searchParams.get("sortDirection") === "asc" ? "asc" : "desc"
    }
  });

  const csv = toCsv(data.rows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gsc-keywords-${dateFrom}-to-${dateTo}.csv"`
    }
  });
}
