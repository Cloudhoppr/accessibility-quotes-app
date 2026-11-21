// @ts-nocheck -- Node-only dev script; offline check of request builders/parsers:  npx tsx scripts/test-parsers.ts
import { buildDecisionRequest, parseDecisionResponse } from "../src/ai/decision";
import { buildImageEditBody, extractImage } from "../src/ai/gemini";
import { buildPriceRequest, parsePriceResponse } from "../src/ai/prices";

const room = { source: "scan", hasToilet: false, hasTub: true, hasSink: true, objects: [], wallCount: 4, doorCount: 1, approxFloorM2: 4 };
const intake = { forWhom: "self", mobility: "wheelchair", worries: [] };
const { body, applicable } = buildDecisionRequest({ photos: [{ slot: "bath", base64: "AAAA", uri: "", width: 1, height: 1, source: "camera" }], room, intake });
console.log("applicable:", applicable, "questions:", Object.keys(body.questions), "input types:", body.input.map((b) => b.type));
console.log(body.input[0].text);
const resp = {
  answers: {
    is_bathroom: { type: "noul", noul: 0.97, confidence: 0.97 },
    tub_shower_grab_bar: { type: "choice", choice: "needed", probabilities: { already_installed: 0.05, needed: 0.9, not_needed: 0.05 }, confidence: 0.9 },
    lever_handles: { type: "choice", choice: "already_installed", probabilities: { already_installed: 0.8, needed: 0.15, not_needed: 0.05 }, confidence: 0.8 },
  },
};
console.log(JSON.stringify(parseDecisionResponse(resp, applicable)));
console.log(JSON.stringify(buildImageEditBody("p", "B64")).slice(0, 300));
console.log(extractImage({ candidates: [{ content: { parts: [{ text: "x", thought: true }, { inlineData: { data: "T", mimeType: "image/png" }, thought: true }, { inlineData: { data: "IMG", mimeType: "image/png" } }] } }] }));
console.log(buildPriceRequest(["toilet_grab_bar", "shower_seat"]));
const pr = {
  status: "completed",
  steps: [
    { type: "google_search_call", arguments: { queries: ["grab bar installation cost Manhattan", "shower seat price"] } },
    { type: "google_search_result", result: [{ search_suggestions: "<html>" }] },
    { type: "thought" },
    {
      type: "model_output",
      content: [{ type: "text", text: '{"toilet_grab_bar": {"low": 180, "high": "$450"}, "shower_seat": {"low": 5, "high": 9000}, "nonslip_mat": {"low": 20, "high": 60}}', annotations: [{ type: "url_citation", title: "angi.com", url: "https://b" }] }],
    },
  ],
};
console.log(JSON.stringify(parsePriceResponse(pr, ["toilet_grab_bar", "shower_seat", "nonslip_mat"]), null, 1));
