// Live Gemini 4 + Google Search price refresh via the Interactions API. Never throws. Pure TS (importable from Node).
// generateContent + google_search was measured at 20-70 s with no groundingMetadata; Interactions + argon ~16 s.
import { API_BASE, GEMINI_API_KEY, HAS_KEY, PRICE_MODEL, TIMEOUTS } from "../config";
import type { FixtureId, LivePrices, PriceSource, Result } from "../contracts";
import { SAVED_PRICES } from "../data/prices";
import { postJson } from "./http";
import { withFallback } from "./withFallback";

/** argon was the fastest grounded Gemini 4 variant in preflight; config.PRICE_MODEL is expected to match. */
export const PRICE_MODEL_LIVE = PRICE_MODEL.includes("argon") ? PRICE_MODEL : "gemini-4-argon";
export const INTERACTIONS_URL = `${API_BASE}/v1beta/interactions`;
export const INTERACTIONS_HEADERS = { "Api-Revision": "2026-05-20" };

export function buildPriceRequest(fixtureIds: FixtureId[]) {
  const list = fixtureIds
    .map((id) => {
      const e = SAVED_PRICES.items[id];
      const diy = e && e.laborLow === 0 ? "; usually a product bought and set up without a contractor, so mostly product cost" : "";
      return `- ${id}: ${e?.displayName ?? id} (${e?.unit ?? "each"}${diy})`;
    })
    .join("\n");
  const prompt =
    "Search the web for current typical INSTALLED costs (parts plus professional labor, in US dollars) " +
    "in Manhattan, New York City, for each of these bathroom accessibility fixtures (per unit shown):\n" +
    list +
    "\n\nReply with ONLY one JSON object and no other text, mapping each fixture id above to its installed cost range " +
    `as whole dollars, in the form {"${fixtureIds[0]}": {"low": LOW, "high": HIGH}} with LOW and HIGH replaced by numbers. ` +
    "Use exactly the ids above as keys. " +
    "If you cannot find a price for a fixture, leave it out.";
  return { model: PRICE_MODEL_LIVE, input: prompt, tools: [{ type: "google_search" }] };
}

/** Text, url_citation annotations and search queries from an Interactions response. */
export function readInteraction(resp: any): { text: string; citations: PriceSource[]; queries: string[] } {
  const steps: any[] = Array.isArray(resp?.steps) ? resp.steps : Array.isArray(resp?.outputs) ? resp.outputs : [];
  let text = "";
  const citations: PriceSource[] = [];
  const queries: string[] = [];
  const takeContent = (content: any[]) => {
    for (const c of content) {
      if (c?.type === "text" && typeof c.text === "string") text += c.text;
      for (const a of Array.isArray(c?.annotations) ? c.annotations : []) {
        const url = a?.url ?? a?.uri;
        if ((a?.type === "url_citation" || url) && url) citations.push({ title: String(a.title ?? url), url });
      }
    }
  };
  for (const st of steps) {
    if (st?.type === "model_output" || st?.type === "text") takeContent(Array.isArray(st.content) ? st.content : [st]);
    if (st?.type === "google_search_call") {
      for (const q of Array.isArray(st?.arguments?.queries) ? st.arguments.queries : []) if (typeof q === "string") queries.push(q);
    }
  }
  if (!text && typeof resp?.output_text === "string") text = resp.output_text;
  return { text, citations, queries };
}

/** Pull the first balanced-looking JSON object out of model text (handles ```json fences). */
export function extractJsonObject(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text.match(/\{[\s\S]*\}/)?.[0]].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      return JSON.parse(c.trim());
    } catch {
      // try next
    }
  }
  throw new Error(`no JSON object in model text: ${text.slice(0, 200)}`);
}

const num = (v: unknown): number | null => {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,\s]/g, ""));
    return isFinite(n) ? n : null;
  }
  return null;
};

export function savedInstalledRange(id: FixtureId): { low: number; high: number } | null {
  const e = SAVED_PRICES.items[id];
  if (!e) return null;
  return { low: e.partsLow + e.laborLow, high: e.partsHigh + e.laborHigh };
}

export function parsePriceResponse(resp: any, fixtureIds: FixtureId[]): { prices: LivePrices; rejected: string[] } {
  const { text, citations, queries } = readInteraction(resp);
  const obj = extractJsonObject(text);
  const root = obj?.items && typeof obj.items === "object" ? obj.items : obj;
  const items: LivePrices["items"] = {};
  const rejected: string[] = [];
  for (const id of fixtureIds) {
    const r = root?.[id];
    const low = num(r?.low ?? r?.min ?? (Array.isArray(r) ? r[0] : undefined));
    const high = num(r?.high ?? r?.max ?? (Array.isArray(r) ? r[1] : undefined));
    const saved = savedInstalledRange(id);
    if (low == null || high == null || !saved) {
      rejected.push(`${id}: missing`);
      continue;
    }
    // Both ends must sit inside [0.33 x saved low, 3 x saved high].
    const minOk = saved.low * 0.33;
    const maxOk = saved.high * 3;
    const ok = low > 0 && low <= high && low >= minOk && high <= maxOk && high >= minOk && low <= maxOk;
    if (!ok) {
      rejected.push(`${id}: ${low}-${high} outside ${Math.round(minOk)}-${maxOk}`);
      continue;
    }
    items[id] = { low: Math.round(low), high: Math.round(high) };
  }

  // Sources: url_citation annotations first, then one Google link per search query actually run.
  const all: PriceSource[] = [
    ...citations,
    ...queries.map((q) => ({ title: `Google search: "${q.replace(/"/g, "")}"`, url: `https://www.google.com/search?q=${encodeURIComponent(q)}` })),
  ];
  const sources: PriceSource[] = [];
  const seen = new Set<string>();
  for (const src of all) {
    if (seen.has(src.url)) continue;
    seen.add(src.url);
    sources.push(src);
    if (sources.length >= 6) break;
  }
  return { prices: { items, sources, fetchedAt: new Date().toISOString() }, rejected };
}

/** Live call only (throws on any failure). Exposed for scripts/test-ai.ts. */
export async function fetchLivePricesLive(fixtureIds: FixtureId[]): Promise<LivePrices & { rejected: string[] }> {
  if (!HAS_KEY) throw new Error("no API key");
  const ids = fixtureIds.filter((id) => SAVED_PRICES.items[id]);
  if (ids.length === 0) throw new Error("no fixtures to price");
  const resp = await postJson(INTERACTIONS_URL, buildPriceRequest(ids), {
    apiKey: GEMINI_API_KEY,
    timeoutMs: TIMEOUTS.priceMs,
    label: "prices",
    model: PRICE_MODEL_LIVE,
    headers: INTERACTIONS_HEADERS,
  });
  if (resp?.status && resp.status !== "completed") throw new Error(`interaction status ${resp.status}`);
  const { prices, rejected } = parsePriceResponse(resp, ids);
  if (Object.keys(prices.items).length === 0) throw new Error(`no plausible live prices (${rejected.join("; ")})`);
  return { ...prices, rejected };
}

export async function fetchLivePrices(fixtureIds: FixtureId[]): Promise<Result<LivePrices | null>> {
  return withFallback<LivePrices | null>(async () => {
    const { rejected: _r, ...prices } = await fetchLivePricesLive(fixtureIds);
    return prices;
  }, null);
}
