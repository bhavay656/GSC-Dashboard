"use client";

import { Download, LogOut, RefreshCw, Search } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { cn, formatCompactDate, formatNumber, formatPercent } from "@/lib/utils";

type Property = {
  siteUrl: string;
  permissionLevel: string;
};

type DashboardResponse = {
  summary: {
    totals: {
      totalQueries: number;
      totalClicks: number;
      totalImpressions: number;
      avgCtr: number;
      avgPosition: number;
    };
    breakdowns: {
      keywordsByIntent: Array<{ label: string; value: number }>;
      keywordsByProduct: Array<{ label: string; value: number }>;
      clicksByIntent: Array<{ label: string; value: number }>;
      clicksByProduct: Array<{ label: string; value: number }>;
      avgPositionByProduct: Array<{ label: string; value: number }>;
    };
  };
  rows: Array<{
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
    syncedAt: string;
  }>;
  lastSyncedAt: string | null;
};

const DEFAULT_SUMMARY: DashboardResponse["summary"] = {
  totals: {
    totalQueries: 0,
    totalClicks: 0,
    totalImpressions: 0,
    avgCtr: 0,
    avgPosition: 0
  },
  breakdowns: {
    keywordsByIntent: [],
    keywordsByProduct: [],
    clicksByIntent: [],
    clicksByProduct: [],
    avgPositionByProduct: []
  }
};

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultDates() {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - 28);

  return {
    dateFrom: formatDateInput(start),
    dateTo: formatDateInput(today)
  };
}

function BreakdownCard({
  title,
  items,
  formatter = (value: number) => formatNumber(value)
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
  formatter?: (value: number) => string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="rounded-3xl border border-white/70 bg-white/95 p-5 shadow-soft">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-4 text-xs text-slate-600">
                <span className="truncate">{item.label}</span>
                <span className="font-medium text-ink">{formatter(item.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-sea transition-all"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No synced data yet.</p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/95 p-5 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

export function DashboardShell({
  user
}: {
  user: {
    name: string;
    email: string;
  };
}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [dashboard, setDashboard] = useState<DashboardResponse>({
    summary: DEFAULT_SUMMARY,
    rows: [],
    lastSyncedAt: null
  });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Loading properties...");
  const [isPending, startTransition] = useTransition();
  const [dates, setDates] = useState(defaultDates);
  const [filters, setFilters] = useState({
    intent: "All",
    product: "All",
    keywordContains: "",
    pageContains: "",
    minPosition: "",
    maxPosition: "",
    sortBy: "clicks",
    sortDirection: "desc"
  });

  const productOptions = useMemo(() => {
    const products = new Set(dashboard.rows.map((row) => row.product));
    return ["All", ...Array.from(products).sort()];
  }, [dashboard.rows]);

  const intentOptions = useMemo(() => {
    const intents = new Set(dashboard.rows.map((row) => row.intent));
    return ["All", ...Array.from(intents)];
  }, [dashboard.rows]);

  async function loadProperties() {
    setError("");
    const response = await fetch("/api/properties");

    if (!response.ok) {
      throw new Error("Unable to load Search Console properties.");
    }

    const data = (await response.json()) as {
      properties: Property[];
      selectedProperty: string | null;
    };

    setProperties(data.properties);
    const nextProperty = data.selectedProperty ?? data.properties[0]?.siteUrl ?? "";
    setSelectedProperty(nextProperty);
    setStatus(
      nextProperty
        ? "Select a date range and refresh data."
        : "Connect an account with Search Console property access."
    );
    return nextProperty;
  }

  async function loadDashboard(propertyUrl: string, nextFilters = filters, nextDates = dates) {
    if (!propertyUrl) {
      return;
    }

    const params = new URLSearchParams({
      propertyUrl,
      dateFrom: nextDates.dateFrom,
      dateTo: nextDates.dateTo,
      sortBy: nextFilters.sortBy,
      sortDirection: nextFilters.sortDirection
    });

    if (nextFilters.intent !== "All") {
      params.set("intent", nextFilters.intent);
    }

    if (nextFilters.product !== "All") {
      params.set("product", nextFilters.product);
    }

    if (nextFilters.keywordContains) {
      params.set("keywordContains", nextFilters.keywordContains);
    }

    if (nextFilters.pageContains) {
      params.set("pageContains", nextFilters.pageContains);
    }

    if (nextFilters.minPosition) {
      params.set("minPosition", nextFilters.minPosition);
    }

    if (nextFilters.maxPosition) {
      params.set("maxPosition", nextFilters.maxPosition);
    }

    const response = await fetch(`/api/dashboard?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Unable to load dashboard data.");
    }

    const data = (await response.json()) as DashboardResponse;
    setDashboard(data);
    setStatus(data.rows.length ? "Dashboard ready." : "No cached data yet. Run a refresh.");
  }

  useEffect(() => {
    startTransition(() => {
      loadProperties()
        .then((propertyUrl) => {
          if (propertyUrl) {
            return loadDashboard(propertyUrl);
          }
        })
        .catch((loadError: Error) => {
          setError(loadError.message);
          setStatus("Unable to initialize dashboard.");
        });
    });
  }, []);

  function handleRefresh(force = true) {
    if (!selectedProperty) {
      setError("Choose a Search Console property first.");
      return;
    }

    startTransition(() => {
      setError("");
      setStatus("Syncing Search Console data...");

      fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          propertyUrl: selectedProperty,
          dateFrom: dates.dateFrom,
          dateTo: dates.dateTo,
          force
        })
      })
        .then(async (response) => {
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as
              | { error?: string }
              | null;
            throw new Error(payload?.error ?? "Search Console sync failed.");
          }

          await loadDashboard(selectedProperty);
          setStatus("Search Console data synced successfully.");
        })
        .catch((syncError: Error) => {
          setError(syncError.message);
          setStatus("Sync failed.");
        });
    });
  }

  function handlePropertyChange(propertyUrl: string) {
    setSelectedProperty(propertyUrl);

    startTransition(() => {
      fetch("/api/preferences/property", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ propertyUrl })
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Unable to save the selected property.");
          }

          await loadDashboard(propertyUrl);
        })
        .catch((propertyError: Error) => {
          setError(propertyError.message);
        });
    });
  }

  function applyFilterChange(name: string, value: string) {
    const nextFilters = { ...filters, [name]: value };
    setFilters(nextFilters);

    startTransition(() => {
      loadDashboard(selectedProperty, nextFilters).catch((dashboardError: Error) => {
        setError(dashboardError.message);
      });
    });
  }

  function handleDateChange(name: "dateFrom" | "dateTo", value: string) {
    const nextDates = { ...dates, [name]: value };
    setDates(nextDates);
  }

  const exportUrl = useMemo(() => {
    if (!selectedProperty) {
      return "#";
    }

    const params = new URLSearchParams({
      propertyUrl: selectedProperty,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
      sortBy: filters.sortBy,
      sortDirection: filters.sortDirection
    });

    if (filters.intent !== "All") params.set("intent", filters.intent);
    if (filters.product !== "All") params.set("product", filters.product);
    if (filters.keywordContains) params.set("keywordContains", filters.keywordContains);
    if (filters.pageContains) params.set("pageContains", filters.pageContains);
    if (filters.minPosition) params.set("minPosition", filters.minPosition);
    if (filters.maxPosition) params.set("maxPosition", filters.maxPosition);

    return `/api/export?${params.toString()}`;
  }, [dates.dateFrom, dates.dateTo, filters, selectedProperty]);

  function sortBy(column: string) {
    const nextDirection =
      filters.sortBy === column && filters.sortDirection === "desc" ? "asc" : "desc";
    const nextFilters = {
      ...filters,
      sortBy: column,
      sortDirection: nextDirection
    };
    setFilters(nextFilters);

    startTransition(() => {
      loadDashboard(selectedProperty, nextFilters).catch((dashboardError: Error) => {
        setError(dashboardError.message);
      });
    });
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <header className="rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-sea/20 bg-sea/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sea">
              Search Intelligence
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Keyword intelligence dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Pull Google Search Console performance, enrich each keyword by intent and
              product, and inspect SEO opportunity by property, page, and ranking band.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-line bg-mist px-4 py-3 text-right">
              <div className="text-sm font-medium text-ink">{user.name}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-slate-300"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-4 rounded-[32px] border border-white/60 bg-white/70 p-5 shadow-soft backdrop-blur xl:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm">
            <span className="mb-2 block font-medium text-ink">Property</span>
            <select
              value={selectedProperty}
              onChange={(event) => handlePropertyChange(event.target.value)}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none ring-0"
            >
              <option value="">Select a property</option>
              {properties.map((property) => (
                <option key={property.siteUrl} value={property.siteUrl}>
                  {property.siteUrl}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-2 block font-medium text-ink">Date from</span>
            <input
              type="date"
              value={dates.dateFrom}
              onChange={(event) => handleDateChange("dateFrom", event.target.value)}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block font-medium text-ink">Date to</span>
            <input
              type="date"
              value={dates.dateTo}
              onChange={(event) => handleDateChange("dateTo", event.target.value)}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => handleRefresh(true)}
              disabled={isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
            >
              <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
              Refresh data
            </button>
            <a
              href={exportUrl}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink transition hover:border-slate-300"
            >
              <Download className="h-4 w-4" />
              CSV
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-mist p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Status
              </p>
              <p className="mt-2 text-sm font-medium text-ink">{status}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>Last sync</div>
              <div className="mt-1 font-medium text-slate-700">
                {dashboard.lastSyncedAt ? formatCompactDate(dashboard.lastSyncedAt) : "Not yet"}
              </div>
            </div>
          </div>
          {error ? (
            <div className="mt-4 rounded-2xl border border-coral/20 bg-coral/5 px-4 py-3 text-sm text-coral">
              {error}
            </div>
          ) : null}
          <div className="mt-4 text-xs leading-5 text-slate-500">
            Use a Google OAuth Web Application client and add the exact callback URL for
            local and production environments. This app keeps refresh tokens server-side
            so you do not need to reconnect on every visit.
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total Queries"
          value={formatNumber(dashboard.summary.totals.totalQueries)}
          detail="Unique keyword + page rows in the current slice."
        />
        <SummaryCard
          label="Total Clicks"
          value={formatNumber(dashboard.summary.totals.totalClicks)}
          detail="Clicks across the current filtered result set."
        />
        <SummaryCard
          label="Total Impressions"
          value={formatNumber(dashboard.summary.totals.totalImpressions)}
          detail="Search visibility generated by the filtered rows."
        />
        <SummaryCard
          label="Avg CTR"
          value={formatPercent(dashboard.summary.totals.avgCtr)}
          detail="Weighted click-through rate across the result set."
        />
        <SummaryCard
          label="Avg Position"
          value={formatNumber(dashboard.summary.totals.avgPosition, 2)}
          detail="Average ranking position for the filtered rows."
        />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-5">
        <div className="rounded-[32px] border border-white/70 bg-white/95 p-5 shadow-soft xl:col-span-2">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Filters</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-2 block font-medium text-ink">Intent</span>
              <select
                value={filters.intent}
                onChange={(event) => applyFilterChange("intent", event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              >
                {intentOptions.map((intent) => (
                  <option key={intent} value={intent}>
                    {intent}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-2 block font-medium text-ink">Product</span>
              <select
                value={filters.product}
                onChange={(event) => applyFilterChange("product", event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              >
                {productOptions.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-2 block font-medium text-ink">Keyword contains</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={filters.keywordContains}
                  onChange={(event) => applyFilterChange("keywordContains", event.target.value)}
                  placeholder="e.g. tracking"
                  className="w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4"
                />
              </div>
            </label>
            <label className="text-sm">
              <span className="mb-2 block font-medium text-ink">Page contains</span>
              <input
                value={filters.pageContains}
                onChange={(event) => applyFilterChange("pageContains", event.target.value)}
                placeholder="e.g. container-tracking"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              />
            </label>
            <label className="text-sm">
              <span className="mb-2 block font-medium text-ink">Min position</span>
              <input
                type="number"
                value={filters.minPosition}
                onChange={(event) => applyFilterChange("minPosition", event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              />
            </label>
            <label className="text-sm">
              <span className="mb-2 block font-medium text-ink">Max position</span>
              <input
                type="number"
                value={filters.maxPosition}
                onChange={(event) => applyFilterChange("maxPosition", event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:col-span-3 xl:grid-cols-3">
          <BreakdownCard
            title="Keywords by intent"
            items={dashboard.summary.breakdowns.keywordsByIntent}
          />
          <BreakdownCard
            title="Keywords by product"
            items={dashboard.summary.breakdowns.keywordsByProduct}
          />
          <BreakdownCard
            title="Clicks by intent"
            items={dashboard.summary.breakdowns.clicksByIntent}
          />
          <BreakdownCard
            title="Clicks by product"
            items={dashboard.summary.breakdowns.clicksByProduct}
          />
          <BreakdownCard
            title="Avg position by product"
            items={dashboard.summary.breakdowns.avgPositionByProduct}
            formatter={(value) => formatNumber(value, 2)}
          />
        </div>
      </section>

      <section className="mt-6 rounded-[32px] border border-white/70 bg-white/95 p-5 shadow-soft">
        <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">Detailed keywords</h2>
            <p className="mt-1 text-sm text-slate-500">
              Searchable, sortable, exportable enriched Search Console rows.
            </p>
          </div>
          <div className="text-xs text-slate-500">
            {formatNumber(dashboard.rows.length)} rows shown
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {[
                  ["query", "Keyword"],
                  ["page", "Landing page"],
                  ["clicks", "Clicks"],
                  ["impressions", "Impressions"],
                  ["ctr", "CTR"],
                  ["position", "Position"],
                  ["intent", "Intent"],
                  ["product", "Product"],
                  ["intentPriorityScore", "Priority"]
                ].map(([key, label]) => (
                  <th key={key} className="border-b border-line px-3 py-3 font-medium">
                    <button type="button" onClick={() => sortBy(key)} className="inline-flex">
                      {label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboard.rows.length ? (
                dashboard.rows.map((row) => (
                  <tr key={row.id} className="align-top text-slate-700">
                    <td className="border-b border-line/70 px-3 py-4 font-medium text-ink">
                      {row.query}
                    </td>
                    <td className="max-w-[300px] border-b border-line/70 px-3 py-4">
                      <div className="truncate font-mono text-xs">{row.page}</div>
                    </td>
                    <td className="border-b border-line/70 px-3 py-4">{formatNumber(row.clicks)}</td>
                    <td className="border-b border-line/70 px-3 py-4">
                      {formatNumber(row.impressions)}
                    </td>
                    <td className="border-b border-line/70 px-3 py-4">{formatPercent(row.ctr)}</td>
                    <td className="border-b border-line/70 px-3 py-4">
                      {formatNumber(row.position, 2)}
                    </td>
                    <td className="border-b border-line/70 px-3 py-4">
                      <span className="rounded-full bg-sea/8 px-3 py-1 text-xs font-medium text-sea">
                        {row.intent}
                      </span>
                    </td>
                    <td className="border-b border-line/70 px-3 py-4">{row.product}</td>
                    <td className="border-b border-line/70 px-3 py-4">
                      {row.intentPriorityScore}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-sm text-slate-500">
                    No rows available yet. Choose a property and refresh data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
