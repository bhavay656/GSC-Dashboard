import { google } from "googleapis";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { getCachedRows, saveCachedRows } from "@/lib/storage";
import { getRequiredEnv } from "@/lib/env";
import { buildCacheKey } from "@/lib/utils";
import { enrichKeywordRow } from "@/lib/enrichment";

const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const PAGE_SIZE = 5000;

async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: getRequiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Google access token.");
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
    id_token?: string;
  };

  return {
    accessToken: json.access_token,
    expiresAt: Math.floor(Date.now() / 1000 + json.expires_in),
    refreshToken: json.refresh_token ?? refreshToken
  };
}

async function getGoogleSession(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: getRequiredEnv("NEXTAUTH_SECRET")
  });

  if (!token?.sub || typeof token.accessToken !== "string") {
    throw new Error("Google account is not connected.");
  }

  const expiresAt = typeof token.expiresAt === "number" ? token.expiresAt : 0;
  const now = Math.floor(Date.now() / 1000);

  if (expiresAt > now + 60) {
    return {
      userId: token.sub,
      accessToken: token.accessToken
    };
  }

  if (typeof token.refreshToken !== "string") {
    throw new Error("Google refresh token is missing. Reconnect the account.");
  }

  const refreshed = await refreshGoogleAccessToken(token.refreshToken);

  return {
    userId: token.sub,
    accessToken: refreshed.accessToken
  };
}

async function getSearchConsoleClient(request: NextRequest) {
  const session = await getGoogleSession(request);
  const auth = new google.auth.OAuth2(
    getRequiredEnv("GOOGLE_CLIENT_ID"),
    getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    getRequiredEnv("GOOGLE_REDIRECT_URI")
  );

  auth.setCredentials({ access_token: session.accessToken });

  return {
    userId: session.userId,
    searchconsole: google.searchconsole({
      version: "v1",
      auth
    })
  };
}

export async function listSearchConsoleProperties(request: NextRequest) {
  const { searchconsole } = await getSearchConsoleClient(request);
  const result = await searchconsole.sites.list();

  return (result.data.siteEntry ?? []).map((site) => ({
    siteUrl: site.siteUrl ?? "",
    permissionLevel: site.permissionLevel ?? "siteRestrictedUser"
  }));
}

export async function syncSearchConsoleData(input: {
  request: NextRequest;
  propertyUrl: string;
  dateFrom: string;
  dateTo: string;
  force?: boolean;
}) {
  const { request, propertyUrl, dateFrom, dateTo, force = false } = input;
  const cacheKey = buildCacheKey(propertyUrl, dateFrom, dateTo);
  const { userId, searchconsole } = await getSearchConsoleClient(request);
  const cachedData = await getCachedRows(userId, cacheKey);

  if (
    cachedData &&
    !force &&
    Date.now() - new Date(cachedData.syncedAt).getTime() < CACHE_TTL_MS
  ) {
    return cachedData.rows;
  }

  const rows: Array<{
    id: string;
    query: string;
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    intent: string;
    product: string;
    intentPriorityScore: number;
  }> = [];

  const response = await searchconsole.searchanalytics.query({
    siteUrl: propertyUrl,
    requestBody: {
      startDate: dateFrom,
      endDate: dateTo,
      dimensions: ["query", "page"],
      // Hobby deployments benefit from a capped initial sync rather than
      // attempting to exhaust every row in one request cycle.
      rowLimit: PAGE_SIZE,
      startRow: 0
    }
  });

  const batch = response.data.rows ?? [];

  for (const row of batch) {
    const query = row.keys?.[0] ?? "(not provided)";
    const page = row.keys?.[1] ?? "";
    const enrichment = enrichKeywordRow(query, page);

    rows.push({
      id: `${cacheKey}-0-${rows.length}`,
      query,
      page,
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
      intent: enrichment.intent,
      product: enrichment.product,
      intentPriorityScore: enrichment.intentPriorityScore
    });
  }

  await saveCachedRows(userId, cacheKey, {
    propertyUrl,
    dateFrom,
    dateTo,
    syncedAt: new Date().toISOString(),
    rows
  });

  return rows;
}
