export type Intent = "High Intent" | "Mid Intent" | "Low Intent";

export type EnrichedKeywordRow = {
  id: string;
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  intent: Intent;
  product: string;
  intentPriorityScore: number;
  syncedAt: string;
};

export type DashboardFilters = {
  intent?: string;
  product?: string;
  keywordContains?: string;
  pageContains?: string;
  minPosition?: number;
  maxPosition?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
};
