// STUB (owned by AI agent): live Gemini 4 + Google Search price refresh. Never throws.
import type { FixtureId, LivePrices, Result } from "../contracts";
import { withFallback } from "./withFallback";

export async function fetchLivePrices(fixtureIds: FixtureId[]): Promise<Result<LivePrices | null>> {
  return withFallback<LivePrices | null>(async () => {
    throw new Error("not implemented");
  }, null);
}
