import type { DashboardFilters } from "@/lib/types";
import { buildCacheKey } from "@/lib/utils";
import { getCachedRows, getSelectedProperty, saveSelectedProperty } from "@/lib/storage";

const SORTABLE_FIELDS = new Set([
  "query",
  "page",
  "clicks",
  "impressions",
  "ctr",
  "position",
  "intent",
  "product",
  "intentPriorityScore",
  "syncedAt"
]);

export async function getUserPreference(userId: string) {
  const selectedProperty = await getSelectedProperty(userId);
  return {
    selectedProperty
  };
}

export async function saveUserPreference(userId: string, selectedProperty: string) {
  await saveSelectedProperty(userId, selectedProperty);
  return {
    selectedProperty
  };
}

function applyFilters<T extends { intent: string; product: string; query: string; page: string; position: number }>(
  rows: T[],
  filters: DashboardFilters
) {
  return rows.filter((row) => {
    if (filters.intent && filters.intent !== "All" && row.intent !== filters.intent) {
      return false;
    }

    if (filters.product && filters.product !== "All" && row.product !== filters.product) {
      return false;
    }

    if (filters.keywordContains && !row.query.toLowerCase().includes(filters.keywordContains.toLowerCase())) {
      return false;
    }

    if (filters.pageContains && !row.page.toLowerCase().includes(filters.pageContains.toLowerCase())) {
      return false;
    }

    if (typeof filters.minPosition === "number" && row.position < filters.minPosition) {
      return false;
    }

    if (typeof filters.maxPosition === "number" && row.position > filters.maxPosition) {
      return false;
    }

    return true;
  });
}

function sortRows<T extends Record<string, string | number | Date>>(
  rows: T[],
  filters: DashboardFilters
) {
  const sortBy = filters.sortBy && SORTABLE_FIELDS.has(filters.sortBy) ? filters.sortBy : "clicks";
  const direction = filters.sortDirection === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    const leftValue = left[sortBy];
    const rightValue = right[sortBy];

    if (leftValue === rightValue) {
      return 0;
    }

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * direction;
    }

    return String(leftValue).localeCompare(String(rightValue)) * direction;
  });
}

function summarize(rows: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number; intent: string; product: string }>) {
  const totalQueries = rows.length;
  const totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const totalImpressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const avgCtr = totalImpressions === 0 ? 0 : totalClicks / totalImpressions;
  const avgPosition =
    totalQueries === 0 ? 0 : rows.reduce((sum, row) => sum + row.position, 0) / totalQueries;

  const keywordsByIntent = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.intent] = (acc[row.intent] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value }));

  const keywordsByProduct = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.product] = (acc[row.product] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value }));

  const clicksByIntent = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.intent] = (acc[row.intent] ?? 0) + row.clicks;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value }));

  const clicksByProduct = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.product] = (acc[row.product] ?? 0) + row.clicks;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value }));

  const avgPositionByProduct = Object.entries(
    rows.reduce<Record<string, { total: number; count: number }>>((acc, row) => {
      const current = acc[row.product] ?? { total: 0, count: 0 };
      current.total += row.position;
      current.count += 1;
      acc[row.product] = current;
      return acc;
    }, {})
  ).map(([label, stats]) => ({
    label,
    value: stats.count === 0 ? 0 : stats.total / stats.count
  }));

  return {
    totals: {
      totalQueries,
      totalClicks,
      totalImpressions,
      avgCtr,
      avgPosition
    },
    breakdowns: {
      keywordsByIntent,
      keywordsByProduct,
      clicksByIntent,
      clicksByProduct,
      avgPositionByProduct
    }
  };
}

export async function getDashboardData(input: {
  userId: string;
  propertyUrl: string;
  dateFrom: string;
  dateTo: string;
  filters: DashboardFilters;
}) {
  const cached = await getCachedRows(
    input.userId,
    buildCacheKey(input.propertyUrl, input.dateFrom, input.dateTo)
  );
  const rows = cached?.rows ?? [];

  const filteredRows = applyFilters(rows, input.filters);
  const sortedRows = sortRows(filteredRows, input.filters);
  const summary = summarize(filteredRows);

  return {
    summary,
    rows: sortedRows.map((row) => ({
      id: row.id,
      query: row.query,
      page: row.page,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      intent: row.intent,
      product: row.product,
      intentPriorityScore: row.intentPriorityScore,
      syncedAt: cached?.syncedAt ?? new Date().toISOString()
    })),
    lastSyncedAt: cached?.syncedAt ?? null
  };
}

export function toCsv(
  rows: Array<{
    query: string;
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    intent: string;
    product: string;
    intentPriorityScore: number;
  }>
) {
  const header = [
    "keyword",
    "landing_page",
    "clicks",
    "impressions",
    "ctr",
    "position",
    "intent",
    "product",
    "intent_priority_score"
  ];

  const lines = rows.map((row) =>
    [
      row.query,
      row.page,
      row.clicks,
      row.impressions,
      row.ctr,
      row.position,
      row.intent,
      row.product,
      row.intentPriorityScore
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );

  return [header.join(","), ...lines].join("\n");
}
