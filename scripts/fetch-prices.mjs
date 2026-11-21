#!/usr/bin/env node
// One-off dev script: research Manhattan installed-cost ranges for each fixture with
// Gemini 4 (argon) + Google Search grounding via the Interactions API, all 7 fixtures in parallel,
// and print a draft prices.json "items" block. (generateContent grounding measured 20-70 s with no
// citations; Interactions + argon ~16 s.)
//
// Usage (repo root):  node scripts/fetch-prices.mjs [--write]
//   Reads EXPO_PUBLIC_GEMINI_API_KEY from ./.env (the key is never printed).
//   Without --write it prints the draft to stdout and saves scripts/prices-draft.json.
//   With --write it also merges numbers + sources into src/data/prices.json (outliers are skipped).
//   --only id1,id2 re-researches just those fixtures.
// ALWAYS sanity-check the numbers by hand before committing (see docs/pricing-notes.md).
// No dependencies; Node 22+.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = resolve(ROOT, ".env");
const PRICES_PATH = resolve(ROOT, "src/data/prices.json");
const DRAFT_PATH = resolve(ROOT, "scripts/prices-draft.json");
const MODEL = "gemini-4-argon";
const API = "https://generativelanguage.googleapis.com/v1beta/interactions";
const API_REVISION = "2026-05-20";
const TIMEOUT_MS = 90000;

const FIXTURES = {
  toilet_grab_bar:
    "one 18-42 inch stainless steel grab bar installed on the wall beside a toilet (into studs or with heavy-duty anchors through tile)",
  tub_shower_grab_bar: "a set of 2 stainless steel grab bars installed on a tiled bathtub/shower wall",
  shower_seat: "a shower seat or tub transfer bench for an older adult (freestanding, or wall-mounted fold-down)",
  raised_toilet_seat: "a raised toilet seat with armrests (3-5 inch riser)",
  handheld_shower:
    "a handheld shower head with hose and vertical slide bar, professionally installed replacing a fixed shower head",
  nonslip_mat: "non-slip adhesive tub strips plus a rubber-backed bath mat (DIY, no labor)",
  lever_handles: "replacing a bathroom sink faucet with a single-lever faucet, installed by a plumber",
};

// Installed total per unit (USD). Anything outside gets flagged for a hand fix.
const BANDS = {
  toilet_grab_bar: [100, 450],
  tub_shower_grab_bar: [150, 900],
  shower_seat: [30, 600],
  raised_toilet_seat: [20, 300],
  handheld_shower: [100, 800],
  nonslip_mat: [10, 120],
  lever_handles: [150, 1000],
};

function loadKey() {
  if (!existsSync(ENV_PATH)) return "";
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?EXPO_PUBLIC_GEMINI_API_KEY\s*=\s*(.*?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

function prompt(desc) {
  return [
    `Search the web for the current cost of ${desc} in Manhattan, New York City (prefer NYC-specific sources; national ranges are acceptable if NYC data is unavailable).`,
    "Give the parts/product cost range and the professional installation labor range separately, in USD, per unit.",
    "Reply with ONLY strict JSON, no markdown, exactly this shape:",
    '{"partsLow":number,"partsHigh":number,"laborLow":number,"laborHigh":number,"notes":"one short sentence on what the sources said"}',
  ].join("\n");
}

async function fetchWithTimeout(url, opts = {}, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function callGemini(key, text) {
  const t0 = Date.now();
  const res = await fetchWithTimeout(API, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key, "Api-Revision": API_REVISION },
    body: JSON.stringify({ model: MODEL, input: text, tools: [{ type: "google_search" }] }),
  });
  const ms = Date.now() - t0;
  const body = await res.text();
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`), { status: res.status, ms });
  return { json: JSON.parse(body), ms };
}

// Interactions response: steps[] with google_search_call {arguments.queries}, model_output {content[{type:"text",text,annotations}]}.
function parseReply(json) {
  if (json?.status && json.status !== "completed") throw new Error(`interaction status ${json.status}`);
  let text = "";
  const citations = [];
  const queries = [];
  for (const st of json?.steps ?? []) {
    if (st?.type === "google_search_call") queries.push(...(st.arguments?.queries ?? []).filter((q) => typeof q === "string"));
    if (st?.type === "model_output") {
      for (const c of st.content ?? []) {
        if (c?.type === "text") text += c.text ?? "";
        for (const a of c?.annotations ?? []) if (a?.url) citations.push({ title: a.title ?? a.url, url: a.url });
      }
    }
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const m = fenced?.[1] ?? text.match(/\{[\s\S]*\}/)?.[0];
  if (!m) throw new Error(`no JSON in reply: ${text.slice(0, 200)}`);
  const obj = JSON.parse(m);
  for (const k of ["partsLow", "partsHigh", "laborLow", "laborHigh"]) {
    if (typeof obj[k] !== "number" || !Number.isFinite(obj[k])) throw new Error(`bad field ${k}`);
  }
  const querySources = queries.map((q) => ({
    title: `Google search: "${q.replace(/"/g, "")}"`,
    url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  }));
  return { ...obj, citations, queries, querySources };
}

// Grounding citation URLs are expiring vertexaisearch.cloud.google.com redirects; follow them to the final page.
async function resolveUrl(url) {
  let cur = url;
  for (let i = 0; i < 5; i++) {
    try {
      let res = await fetchWithTimeout(cur, { method: "HEAD", redirect: "manual" }, 10000);
      if (res.status === 405 || res.status === 403) res = await fetchWithTimeout(cur, { method: "GET", redirect: "manual" }, 10000);
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        cur = new URL(loc, cur).toString();
        continue;
      }
      return cur;
    } catch {
      return cur;
    }
  }
  return cur;
}

function dedupe(list, max) {
  const seen = new Set();
  const out = [];
  for (const s of list) {
    if (!s?.url || seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

async function researchOne(key, id, desc) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { json, ms } = await callGemini(key, prompt(desc));
      const r = parseReply(json);
      r.citations = (
        await Promise.all(r.citations.map(async (c) => ({ title: c.title, url: await resolveUrl(c.url) })))
      ).filter((c) => !c.url.includes("vertexaisearch.cloud.google.com"));
      console.error(
        `${id}: ${MODEL} ${ms} ms, parts ${r.partsLow}-${r.partsHigh}, labor ${r.laborLow}-${r.laborHigh}, ${r.citations.length} citations, ${r.queries.length} queries`,
      );
      return { id, ms, r };
    } catch (e) {
      console.error(`${id}: attempt ${attempt} failed (${e.status ?? "err"}${e.ms ? `, ${e.ms} ms` : ""}): ${String(e.message).slice(0, 200)}`);
    }
  }
  return { id, ms: null, r: null };
}

async function main() {
  const key = loadKey();
  if (!key) {
    console.error(`No EXPO_PUBLIC_GEMINI_API_KEY in ${ENV_PATH}. Keeping the hand estimates in prices.json.`);
    process.exit(1);
  }
  const write = process.argv.includes("--write");
  const t0 = Date.now();
  // Optional: --only id1,id2 to re-research just those fixtures.
  const onlyArg = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1].split(",") : null;
  const results = await Promise.all(Object.entries(FIXTURES).filter(([id]) => !onlyArg || onlyArg.includes(id)).map(([id, desc]) => researchOne(key, id, desc)));
  console.error(`all ${results.length} fixtures in ${Date.now() - t0} ms (parallel)`);

  const out = {};
  const timings = [];
  for (const { id, ms, r } of results) {
    if (!r) {
      out[id] = null;
      continue;
    }
    const [lo, hi] = BANDS[id];
    const tLow = r.partsLow + r.laborLow;
    const tHigh = r.partsHigh + r.laborHigh;
    const outlier = tLow < lo || tHigh > hi || tLow > tHigh || r.partsLow > r.partsHigh || r.laborLow > r.laborHigh;
    if (outlier) console.error(`!! ${id}: installed ${tLow}-${tHigh} outside sanity band ${lo}-${hi}; NOT written, keep hand values`);
    out[id] = {
      partsLow: r.partsLow,
      partsHigh: r.partsHigh,
      laborLow: r.laborLow,
      laborHigh: r.laborHigh,
      notes: r.notes ?? "",
      outlier,
      citations: r.citations,
      queries: r.queries,
      querySources: r.querySources,
    };
    timings.push({ id, model: MODEL, ms });
  }

  const draft = { gatheredOn: new Date().toISOString().slice(0, 10), model: MODEL, api: "interactions", timings, items: out };
  writeFileSync(DRAFT_PATH, JSON.stringify(draft, null, 2) + "\n");
  console.log(JSON.stringify(draft, null, 2));

  if (write) {
    const prices = JSON.parse(readFileSync(PRICES_PATH, "utf8"));
    let written = 0;
    for (const [id, r] of Object.entries(out)) {
      if (!r || r.outlier || !prices.items[id]) continue;
      // Gemini citations + its search queries first, then the hand-researched pages already in the file.
      const sources = dedupe([...r.citations, ...r.querySources.slice(0, 3), ...(prices.items[id].sources ?? [])], 8);
      Object.assign(prices.items[id], {
        partsLow: Math.round(r.partsLow),
        partsHigh: Math.round(r.partsHigh),
        laborLow: Math.round(r.laborLow),
        laborHigh: Math.round(r.laborHigh),
        sources,
      });
      written++;
    }
    prices.gatheredOn = draft.gatheredOn;
    // Describe the whole file, not just this run: fixtures with Google-search sources came from Gemini.
    const ids = Object.keys(prices.items);
    const fromGemini = ids.filter((id) => (prices.items[id].sources ?? []).some((x) => x.url.startsWith("https://www.google.com/search")));
    const hand = ids.filter((id) => !fromGemini.includes(id));
    prices.method = `Gemini 4 (${MODEL}) with Google Search grounding via the Interactions API, one query per fixture for parts and labor cost in Manhattan, NYC, gathered ${draft.gatheredOn}, for ${fromGemini.length} of ${ids.length} fixtures; sources are Gemini's cited pages and the Google searches it ran, plus hand-checked cost-guide and retail pages.${hand.length ? ` Hand estimates kept for ${hand.join(", ")} because Gemini's range fell outside our sanity band.` : ""}`;
    writeFileSync(PRICES_PATH, JSON.stringify(prices, null, 2) + "\n");
    console.error(`Wrote ${PRICES_PATH} (${written} fixtures updated)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
