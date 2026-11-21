// @ts-nocheck -- Node-only dev script (no @types/node in this app); run with npx tsx.
// Live preflight of the three Gemini calls from Node:  npx tsx scripts/test-ai.ts [--only decision|preview|prices]
// Reads EXPO_PUBLIC_GEMINI_API_KEY from .env (never printed). Writes the Nano Banana output to OUT_DIR
// (default: OS temp dir /safestep-test), never into the repo.
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function loadEnv() {
  const p = path.join(ROOT, ".env");
  if (!fs.existsSync(p)) return false;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
  return true;
}

function shape(v: any, depth = 0): any {
  if (Array.isArray(v)) return v.length ? [shape(v[0], depth + 1), `(${v.length})`] : [];
  if (v && typeof v === "object") {
    if (depth > 3) return "{...}";
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x, depth + 1)]));
  }
  if (typeof v === "string") return v.length > 60 ? `string(${v.length})` : v;
  return v;
}

async function timed<T>(name: string, fn: () => Promise<T>): Promise<T | undefined> {
  const t = Date.now();
  try {
    const r = await fn();
    console.log(`\n[${name}] OK in ${Date.now() - t} ms`);
    return r;
  } catch (e: any) {
    console.log(`\n[${name}] FAILED in ${Date.now() - t} ms: status=${e?.status ?? "-"} ${String(e?.message ?? e).slice(0, 600)}`);
    return undefined;
  }
}

async function main() {
  const hasEnv = loadEnv();
  const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
  // Print the raw response shape (base64 collapsed) of every REST call.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    const res = await realFetch(input, init);
    res
      .clone()
      .text()
      .then((t) => {
        let s: any = t.slice(0, 300);
        try {
          s = shape(JSON.parse(t));
        } catch {}
        console.log(`  <- ${String(input).replace(/\?.*$/, "")} HTTP ${res.status} shape: ${JSON.stringify(s).slice(0, 1500)}`);
      })
      .catch(() => {});
    return res;
  }) as typeof fetch;
  // Import after env is loaded: config.ts reads process.env at module load.
  const config = await import("../src/config");
  console.log(`.env found: ${hasEnv}; key present: ${config.HAS_KEY}`);
  console.log(`models: decision=${config.DECISION_MODEL} price=${config.PRICE_MODEL} image=${config.IMAGE_MODEL} (fallback ${config.IMAGE_MODEL_FALLBACK})`);
  if (!config.HAS_KEY) {
    console.log("No EXPO_PUBLIC_GEMINI_API_KEY; live testing is blocked. Exiting.");
    return;
  }
  const { assessBathroomLive, buildDecisionRequest } = await import("../src/ai/decision");
  const { editImage } = await import("../src/ai/gemini");
  const { fetchLivePricesLive } = await import("../src/ai/prices");
  const { FIXTURES } = await import("../src/fixtures");
  const { getCallLog } = await import("../src/ai/log");

  // Photo: --photo <jpg> or PHOTO env var, else first JPEG in assets/demo/.
  const demoDir = path.join(ROOT, "assets", "demo");
  const argPhoto = process.argv.includes("--photo") ? process.argv[process.argv.indexOf("--photo") + 1] : process.env.PHOTO;
  const jpgs = argPhoto ? [argPhoto] : fs.existsSync(demoDir) ? fs.readdirSync(demoDir).filter((f) => /\.jpe?g$/i.test(f)).map((f) => path.join(demoDir, f)) : [];
  const photo = jpgs[0]
    ? {
        slot: (process.env.SLOT ?? (/bath|tub|shower/i.test(jpgs[0]) ? "bath" : "toilet")) as "bath" | "toilet",
        uri: "",
        base64: fs.readFileSync(jpgs[0]).toString("base64"),
        width: 1024,
        height: 1024,
        source: "library" as const,
      }
    : null;
  console.log(`photo: ${photo ? `${path.basename(jpgs[0])} (${Math.round(photo.base64.length / 1024)} KB b64)` : "none (text-only Decision, preview skipped)"}`);

  const intake = { forWhom: "parent" as const, mobility: "cane_walker" as const, worries: ["sit_stand" as const, "slipping" as const] };
  const room = {
    source: "sample" as const,
    hasToilet: true,
    hasTub: true,
    hasSink: true,
    objects: [
      { category: "toilet", w: 0.4, d: 0.7, h: 0.8 },
      { category: "bathtub", w: 1.5, d: 0.75, h: 0.55 },
      { category: "sink", w: 0.6, d: 0.45, h: 0.85 },
    ],
    wallCount: 4,
    doorCount: 1,
    approxFloorM2: 4.5,
  };

  if (!only || only === "decision") {
    const args = { photos: photo ? [photo] : [], room, intake };
    console.log("decision input text:", JSON.stringify(buildDecisionRequest(args).body.input[0].text));
    const d = await timed("decision", () => assessBathroomLive(args));
    if (d) {
      console.log(`isBathroomProb=${d.isBathroomProb.toFixed(2)}`);
      for (const a of Object.values(d.assessments))
        console.log(`  ${a.fixtureId.padEnd(20)} ${a.status.padEnd(18)} pNeeded=${a.pNeeded.toFixed(2)} pInstalled=${a.pInstalled.toFixed(2)} conf=${a.confidence.toFixed(2)}`);
    }
  }

  if ((!only || only === "preview") && photo) {
    const fixtureId = photo.slot === "bath" ? "tub_shower_grab_bar" : "toilet_grab_bar";
    const r = await timed("preview", () =>
      editImage({ apiKey: config.GEMINI_API_KEY, prompt: FIXTURES[fixtureId].editPrompt, jpegBase64: photo.base64, timeoutMs: config.TIMEOUTS.imageMs })
    );
    if (r) {
      const outDir = process.env.OUT_DIR ?? path.join(os.tmpdir(), "safestep-test");
      fs.mkdirSync(outDir, { recursive: true });
      const out = path.join(outDir, `preview-${fixtureId}.${r.mimeType.includes("png") ? "png" : "jpg"}`);
      fs.writeFileSync(out, Buffer.from(r.data, "base64"));
      console.log(`model=${r.model} mime=${r.mimeType} bytes=${Buffer.from(r.data, "base64").length} attempts=[${r.attempts.join("; ")}] saved=${out}`);
    }
  }

  if (!only || only === "prices") {
    const p = await timed("prices", () => fetchLivePricesLive(["toilet_grab_bar", "tub_shower_grab_bar", "shower_seat", "nonslip_mat"]));
    if (p) console.log(JSON.stringify({ items: p.items, rejected: p.rejected, sources: p.sources }, null, 2));
  }

  console.log("\ncall log:");
  for (const e of getCallLog().reverse()) console.log(`  ${e.label} ${e.model} status=${e.status} ${e.ms}ms sent=${e.bytesSent}B ${e.error ?? ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
