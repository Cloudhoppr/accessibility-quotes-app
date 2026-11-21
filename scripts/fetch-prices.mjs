#!/usr/bin/env node
// One-off dev script: research Manhattan installed-cost ranges for each fixture with
// Gemini 4 + Google Search grounding, and print a draft prices.json "items" block.
//
// Usage (repo root):  node scripts/fetch-prices.mjs [--write]
//   Reads EXPO_PUBLIC_GEMINI_API_KEY from ./.env (the key is never printed).
//   Without --write it prints the draft to stdout and saves scripts/prices-draft.json.
//   With --write it also merges numbers + sources into src/data/prices.json.
// ALWAYS sanity-check the numbers by hand before committing (see docs/pricing-notes.md).
// No dependencies; Node 22+.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = resolve(ROOT, ".env");
const PRICES_PATH = resolve(ROOT, "src/data/prices.json");
const DRAFT_PATH = resolve(ROOT, "scripts/prices-draft.json");
const MODELS = ["gemini-4-hydrogen", "gemini-4-carbon", "gemini-4-argon", "gemini-4-neon"];
const API = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 60000;

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

async function callGemini(key, model, text) {
  const t0 = Date.now();
  const res = await fetchWithTimeout(`${API}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text }] }], tools: [{ google_search: {} }] }),
  });
  const ms = Date.now() - t0;
  const body = await res.text();
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`), { status: res.status, ms });
  return { json: JSON.parse(body), ms };
}

function parseReply(json) {
  const cand = json?.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`no JSON in reply: ${text.slice(0, 200)}`);
  const obj = JSON.parse(m[0]);
  for (const k of ["partsLow", "partsHigh", "laborLow", "laborHigh"]) {
    if (typeof obj[k] !== "number" || !Number.isFinite(obj[k])) throw new Error(`bad field ${k}`);
  }
  const chunks = cand?.groundingMetadata?.groundingChunks ?? [];
  const sources = chunks
    .map((c) => c.web)
    .filter((w) => w?.uri)
    .map((w) => ({ title: w.title ?? w.uri, url: w.uri }));
  return { ...obj, sources };
}

// Grounding URIs are often vertexaisearch.cloud.google.com redirect links; follow them to the final page.
async function resolveUrl(url) {
  let cur = url;
  for (let i = 0; i < 5; i++) {
    try {
      let res = await fetchWithTimeout(cur, { method: "HEAD", redirect: "manual" }, 10000);
      if (res.status === 405 || res.status === 403) {
        res = await fetchWithTimeout(cur, { method: "GET", redirect: "manual" }, 10000);
      }
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

async function main() {
  const key = loadKey();
  if (!key) {
    console.error(`No EXPO_PUBLIC_GEMINI_API_KEY in ${ENV_PATH}. Keeping the hand estimates in prices.json.`);
    process.exit(1);
  }
  const write = process.argv.includes("--write");
  let model = MODELS[0];
  const out = {};
  const timings = [];

  for (const [id, desc] of Object.entries(FIXTURES)) {
    let done = false;
    for (const m of [model, ...MODELS.filter((x) => x !== model)]) {
      try {
        const { json, ms } = await callGemini(key, m, prompt(desc));
        const r = parseReply(json);
        const seen = new Set();
        const sources = [];
        for (const s of r.sources) {
          const url = await resolveUrl(s.url);
          if (seen.has(url)) continue;
          seen.add(url);
          sources.push({ title: s.title, url });
        }
        out[id] = {
          partsLow: r.partsLow,
          partsHigh: r.partsHigh,
          laborLow: r.laborLow,
          laborHigh: r.laborHigh,
          notes: r.notes ?? "",
          sources,
        };
        timings.push({ id, model: m, ms });
        console.error(
          `${id}: ${m} ${ms} ms, parts ${r.partsLow}-${r.partsHigh}, labor ${r.laborLow}-${r.laborHigh}, ${sources.length} sources`,
        );
        model = m; // stick with whichever model works
        done = true;
        break;
      } catch (e) {
        console.error(`${id}: ${m} failed (${e.status ?? "err"}${e.ms ? `, ${e.ms} ms` : ""}): ${String(e.message).slice(0, 200)}`);
      }
    }
    if (!done) out[id] = null;
  }

  for (const [id, r] of Object.entries(out)) {
    if (!r) continue;
    const [lo, hi] = BANDS[id];
    const tLow = r.partsLow + r.laborLow;
    const tHigh = r.partsHigh + r.laborHigh;
    if (tLow < lo || tHigh > hi || tLow > tHigh) {
      console.error(`!! ${id}: installed ${tLow}-${tHigh} outside sanity band ${lo}-${hi}; fix by hand`);
    }
  }

  const draft = { gatheredOn: new Date().toISOString().slice(0, 10), model, timings, items: out };
  writeFileSync(DRAFT_PATH, JSON.stringify(draft, null, 2) + "\n");
  console.log(JSON.stringify(draft, null, 2));

  if (write) {
    const prices = JSON.parse(readFileSync(PRICES_PATH, "utf8"));
    for (const [id, r] of Object.entries(out)) {
      if (!r || !prices.items[id]) continue;
      Object.assign(prices.items[id], {
        partsLow: r.partsLow,
        partsHigh: r.partsHigh,
        laborLow: r.laborLow,
        laborHigh: r.laborHigh,
        sources: r.sources,
      });
    }
    prices.gatheredOn = draft.gatheredOn;
    prices.method = `Gemini 4 (${model}) with Google Search grounding, one query per fixture for installed cost in Manhattan, NYC, gathered ${draft.gatheredOn}; numbers checked by hand against the cited pages`;
    writeFileSync(PRICES_PATH, JSON.stringify(prices, null, 2) + "\n");
    console.error(`Wrote ${PRICES_PATH}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
