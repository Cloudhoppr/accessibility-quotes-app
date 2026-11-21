// STUB (owned by logic agent): build the estimate from saved prices, overlaying accepted live prices.
import type { Estimate, FixtureId, LivePrices, PricesFile } from "../contracts";

export function buildEstimate(selected: FixtureId[], prices: PricesFile, live: LivePrices | null): Estimate {
  const lines = selected.map((id) => {
    const p = prices.items[id];
    return { fixtureId: id, name: p.displayName, qty: p.defaultQty, low: (p.partsLow + p.laborLow) * p.defaultQty, high: (p.partsHigh + p.laborHigh) * p.defaultQty, live: false };
  });
  return {
    lines,
    totalLow: lines.reduce((a, l) => a + l.low, 0),
    totalHigh: lines.reduce((a, l) => a + l.high, 0),
    priceSource: "saved",
    sources: [],
    contractor: prices.contractor,
    location: prices.location,
    gatheredOn: prices.gatheredOn,
  };
}
