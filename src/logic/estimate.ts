// Build the estimate from saved prices, overlaying accepted live prices.
import type { Estimate, EstimateLine, FixtureId, LivePrices, PriceSource, PricesFile } from "../contracts";

const r5 = (n: number) => Math.round(n / 5) * 5;

export function buildEstimate(selected: FixtureId[], prices: PricesFile, live: LivePrices | null): Estimate {
  const lines: EstimateLine[] = [];
  const sources: PriceSource[] = [];
  const seen = new Set<string>();
  const addSource = (s: PriceSource) => {
    if (!s?.url || seen.has(s.url)) return;
    seen.add(s.url);
    sources.push(s);
  };

  for (const id of selected) {
    const p = prices.items[id];
    if (!p) continue;
    const qty = p.defaultQty;
    const lv = live?.items?.[id];
    const isLive = !!lv && Number.isFinite(lv.low) && Number.isFinite(lv.high);
    const low = isLive ? lv!.low * qty : (p.partsLow + p.laborLow) * qty;
    const high = isLive ? lv!.high * qty : (p.partsHigh + p.laborHigh) * qty;
    lines.push({ fixtureId: id, name: p.displayName, qty, low: r5(low), high: r5(high), live: isLive });
    p.sources.forEach(addSource);
  }
  if (live) live.sources.forEach(addSource);

  return {
    lines,
    totalLow: lines.reduce((a, l) => a + l.low, 0),
    totalHigh: lines.reduce((a, l) => a + l.high, 0),
    priceSource: lines.some((l) => l.live) ? "live" : "saved",
    sources,
    contractor: prices.contractor,
    location: prices.location,
    gatheredOn: prices.gatheredOn,
  };
}
