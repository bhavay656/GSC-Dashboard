import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, list, put } from "@vercel/blob";
import { getOptionalEnv } from "@/lib/env";

const LOCAL_STATE_PATH = process.env.VERCEL
  ? path.join("/tmp", "gsc-dashboard-state.json")
  : path.join(process.cwd(), "data", "dashboard-state.json");
const BLOB_PATH = "gsc-keyword-intelligence/state.json";

type StoredRow = {
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
};

type CacheEntry = {
  propertyUrl: string;
  dateFrom: string;
  dateTo: string;
  syncedAt: string;
  rows: StoredRow[];
};

type DashboardState = {
  preferences: Record<string, string>;
  caches: Record<string, Record<string, CacheEntry>>;
};

const DEFAULT_STATE: DashboardState = {
  preferences: {},
  caches: {}
};

async function readLocalState() {
  try {
    const file = await readFile(LOCAL_STATE_PATH, "utf8");
    return JSON.parse(file) as DashboardState;
  } catch {
    return DEFAULT_STATE;
  }
}

async function writeLocalState(state: DashboardState) {
  await mkdir(path.dirname(LOCAL_STATE_PATH), { recursive: true });
  await writeFile(LOCAL_STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

async function readBlobState() {
  try {
    const blobToken = getOptionalEnv("BLOB_READ_WRITE_TOKEN");

    if (!blobToken) {
      return DEFAULT_STATE;
    }

    const result = await list({
      prefix: BLOB_PATH,
      token: blobToken
    });

    const blob = result.blobs.find((entry) => entry.pathname === BLOB_PATH);

    if (!blob) {
      return DEFAULT_STATE;
    }

    const response = await fetch(blob.downloadUrl);

    if (!response.ok) {
      return DEFAULT_STATE;
    }

    const text = await response.text();
    return JSON.parse(text) as DashboardState;
  } catch {
    return DEFAULT_STATE;
  }
}

async function writeBlobState(state: DashboardState) {
  const blobToken = getOptionalEnv("BLOB_READ_WRITE_TOKEN");

  if (!blobToken) {
    await writeLocalState(state);
    return;
  }

  const result = await list({
    prefix: BLOB_PATH,
    token: blobToken
  });
  const existing = result.blobs.find((entry) => entry.pathname === BLOB_PATH);

  if (existing) {
    await del(existing.url, {
      token: blobToken
    });
  }

  await put(BLOB_PATH, JSON.stringify(state, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    token: blobToken
  });
}

async function readState() {
  if (getOptionalEnv("BLOB_READ_WRITE_TOKEN")) {
    return readBlobState();
  }

  return readLocalState();
}

async function writeState(state: DashboardState) {
  if (getOptionalEnv("BLOB_READ_WRITE_TOKEN")) {
    await writeBlobState(state);
    return;
  }

  await writeLocalState(state);
}

export async function getSelectedProperty(userId: string) {
  const state = await readState();
  return state.preferences[userId] ?? null;
}

export async function saveSelectedProperty(userId: string, propertyUrl: string) {
  const state = await readState();
  state.preferences[userId] = propertyUrl;
  await writeState(state);
}

export async function getCachedRows(userId: string, cacheKey: string) {
  const state = await readState();
  return state.caches[userId]?.[cacheKey] ?? null;
}

export async function saveCachedRows(userId: string, cacheKey: string, entry: CacheEntry) {
  const state = await readState();
  state.caches[userId] ??= {};
  state.caches[userId][cacheKey] = entry;
  await writeState(state);
}
