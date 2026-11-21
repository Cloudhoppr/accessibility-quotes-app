// @ts-nocheck
// Records one live Gemini 4 + Google Search price response for the sample bathroom's
// suggestions, for Demo mode. Usage: npx tsx scripts/record-sample-prices.ts
import fs from "node:fs";
const env = fs.readFileSync(".env", "utf8").match(/EXPO_PUBLIC_GEMINI_API_KEY=(.*)/);
process.env.EXPO_PUBLIC_GEMINI_API_KEY = env?.[1]?.trim() ?? "";
(async () => {
const { fetchLivePrices } = await import("../src/ai/prices.ts");
const ids = ["shower_seat", "tub_shower_grab_bar", "nonslip_mat", "handheld_shower", "lever_handles"];
const r = await fetchLivePrices(ids);
console.log("source:", r.source, "ms:", r.ms, "error:", r.error ?? "-");
console.log(JSON.stringify(r.value, null, 2));
})();
