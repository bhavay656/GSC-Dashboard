import type { Intent } from "@/lib/types";

const HIGH_INTENT_TERMS = [
  "track",
  "tracking",
  "software",
  "platform",
  "tool",
  "solution",
  "system",
  "pricing",
  "cost",
  "demo",
  "api",
  "integration",
  "provider",
  "company"
];

const MID_INTENT_TERMS = [
  "best",
  "top",
  "compare",
  "vs",
  "alternatives",
  "review",
  "features",
  "benefits"
];

const LOW_INTENT_TERMS = [
  "what",
  "why",
  "how",
  "guide",
  "meaning",
  "definition",
  "examples"
];

const PRODUCT_PAGE_RULES = [
  { match: "container-tracking", product: "Container Tracking" },
  { match: "port-congestion", product: "Port Intelligence" },
  { match: "sailing-schedule", product: "Sailing Schedule" },
  { match: "transit-time", product: "Transit Time" },
  { match: "transit-lead-time", product: "Transit Time" },
  { match: "tariff", product: "Tariff / Rate Benchmarking" }
];

const PRODUCT_KEYWORD_RULES = [
  {
    matches: ["tracking", "track"],
    product: "Container Tracking"
  },
  {
    matches: ["port congestion"],
    product: "Port Intelligence"
  },
  {
    matches: ["sailing schedule", "vessel schedule"],
    product: "Sailing Schedule"
  },
  {
    matches: ["transit time"],
    product: "Transit Time"
  },
  {
    matches: ["tariff", "freight rates"],
    product: "Tariff / Rate Benchmarking"
  }
];

const INTENT_SCORES: Record<Intent, number> = {
  "High Intent": 3,
  "Mid Intent": 2,
  "Low Intent": 1
};

function containsAny(source: string, values: string[]) {
  return values.some((value) => source.includes(value));
}

export function mapIntent(keyword: string): Intent {
  const normalized = keyword.toLowerCase();

  if (containsAny(normalized, HIGH_INTENT_TERMS)) {
    return "High Intent";
  }

  if (containsAny(normalized, MID_INTENT_TERMS)) {
    return "Mid Intent";
  }

  if (containsAny(normalized, LOW_INTENT_TERMS)) {
    return "Low Intent";
  }

  return "Mid Intent";
}

export function mapProduct(keyword: string, page: string) {
  const normalizedPage = page.toLowerCase();
  const pageMatch = PRODUCT_PAGE_RULES.find((rule) =>
    normalizedPage.includes(rule.match)
  );

  if (pageMatch) {
    return pageMatch.product;
  }

  const normalizedKeyword = keyword.toLowerCase();
  const keywordMatch = PRODUCT_KEYWORD_RULES.find((rule) =>
    rule.matches.some((match) => normalizedKeyword.includes(match))
  );

  return keywordMatch?.product ?? "General Supply Chain";
}

export function enrichKeywordRow(keyword: string, page: string) {
  const intent = mapIntent(keyword);
  const product = mapProduct(keyword, page);

  return {
    intent,
    product,
    intentPriorityScore: INTENT_SCORES[intent]
  };
}
