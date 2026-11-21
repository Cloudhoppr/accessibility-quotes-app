// The bundled "Sample bathroom" used by "Try a sample bathroom" and Demo Mode.
//
// Provenance (all real, nothing staged):
// - SAMPLE_ROOM: summarizeRoom() of the author's real Apple RoomPlan scan of an office shower room
//   (assets/demo/86811c6f-...json): sink + wooden bench ("table"), 9 walls, 1 door, ~42 sq ft. RoomPlan has no
//   shower category, so hasTub is set true by hand ("tub" in this app means tub or shower); there is no toilet.
// - SAMPLE_PHOTOS: frames from the same scan's screen recording (t=41 s shower, t=31 s sink, mirror cropped out),
//   with RoomPlan's outline lines / 3D mini-model overlay removed by Nano Banana (gemini-nano-banana-2.1),
//   resized to 1024 px JPEG. Base64 lives in ./sampleImages.ts so non-demo runs send them to the live APIs.
// - SAMPLE_DECISION: recorded from a live Gemini Decision 1 call on 2026-11-21 with both photos, this room and
//   intake {parent, cane_walker, [slipping, tub_transfer]}. Toilet fixtures don't apply (no toilet) -> not_needed.
//   Note: the model rated lever_handles "needed" (0.71) even though the sink has lever handles; kept as recorded.
// - SAMPLE_PREVIEWS: live Nano Banana edits of the shower photo with FIXTURES[id].editPrompt (same date).
import { Image } from "react-native";
import type { DecisionOutput, FixtureId, LivePrices, Photo, RoomSummary } from "../contracts";
import { SAMPLE_SHOWER_B64, SAMPLE_SINK_B64 } from "./sampleImages";

const asset = (m: number) => Image.resolveAssetSource(m)?.uri ?? "";

export const SAMPLE_ROOM: RoomSummary = {
  source: "sample",
  hasToilet: false,
  hasTub: true, // shower stall (RoomPlan has no shower category)
  hasSink: true,
  objects: [
    { category: "sink", w: 0.62, h: 0.3, d: 0.46 },
    { category: "table", w: 0.79, h: 0.5, d: 0.46 },
  ],
  wallCount: 9,
  doorCount: 1,
  approxFloorM2: 3.88,
};

export const SAMPLE_PHOTOS: Photo[] = [
  {
    slot: "bath",
    uri: asset(require("../../assets/demo/sample-shower.jpg")),
    base64: SAMPLE_SHOWER_B64,
    width: 1024,
    height: 768,
    source: "sample",
  },
  {
    slot: "other",
    uri: asset(require("../../assets/demo/sample-sink.jpg")),
    base64: SAMPLE_SINK_B64,
    width: 1024,
    height: 658,
    source: "sample",
  },
];

/** Recorded live Decision 1 output (2026-11-21), values rounded to 3 decimals. */
export const SAMPLE_DECISION: DecisionOutput = {
  isBathroomProb: 0.892,
  assessments: {
    toilet_grab_bar: { fixtureId: "toilet_grab_bar", status: "not_needed", pNeeded: 0.02, pInstalled: 0, confidence: 0.9 },
    tub_shower_grab_bar: { fixtureId: "tub_shower_grab_bar", status: "needed", pNeeded: 0.906, pInstalled: 0.065, confidence: 0.906 },
    shower_seat: { fixtureId: "shower_seat", status: "needed", pNeeded: 0.909, pInstalled: 0.055, confidence: 0.909 },
    raised_toilet_seat: { fixtureId: "raised_toilet_seat", status: "not_needed", pNeeded: 0.02, pInstalled: 0, confidence: 0.9 },
    handheld_shower: { fixtureId: "handheld_shower", status: "needed", pNeeded: 0.669, pInstalled: 0.2, confidence: 0.669 },
    nonslip_mat: { fixtureId: "nonslip_mat", status: "needed", pNeeded: 0.871, pInstalled: 0.094, confidence: 0.871 },
    lever_handles: { fixtureId: "lever_handles", status: "needed", pNeeded: 0.713, pInstalled: 0.219, confidence: 0.713 },
  },
};

/** Pre-rendered "after" images keyed by fixture (bundled asset uris), all edits of the shower photo. */
export const SAMPLE_PREVIEWS: Partial<Record<FixtureId, string>> = {
  tub_shower_grab_bar: asset(require("../../assets/demo/after-tub_shower_grab_bar.jpg")),
  shower_seat: asset(require("../../assets/demo/after-shower_seat.jpg")),
  nonslip_mat: asset(require("../../assets/demo/after-nonslip_mat.jpg")),
};

/** Recorded live price response, used when Demo Mode is on. null = show saved prices. */
// Recorded from a live Gemini 4 (gemini-4-argon) + Google Search call on 2026-11-21 (10.2 s),
// via scripts/record-sample-prices.ts. All five ranges passed the 0.33x-3x check against saved prices.
export const SAMPLE_LIVE_PRICES: LivePrices | null = {
  items: {
    shower_seat: { low: 35, high: 150 },
    tub_shower_grab_bar: { low: 300, high: 650 },
    nonslip_mat: { low: 15, high: 50 },
    handheld_shower: { low: 200, high: 550 },
    lever_handles: { low: 150, high: 450 },
  },
  sources: [
    { title: 'Google search: "grab bar installation cost Manhattan NYC"', url: "https://www.google.com/search?q=grab%20bar%20installation%20cost%20Manhattan%20NYC" },
    { title: 'Google search: "handheld shower slide bar installation cost NYC"', url: "https://www.google.com/search?q=handheld%20shower%20slide%20bar%20installation%20cost%20NYC" },
    { title: 'Google search: "shower seat cost non slip bath mat cost"', url: "https://www.google.com/search?q=shower%20seat%20cost%20non%20slip%20bath%20mat%20cost" },
    { title: 'Google search: "lever faucet handle replacement cost NYC plumber"', url: "https://www.google.com/search?q=lever%20faucet%20handle%20replacement%20cost%20NYC%20plumber" },
  ],
  fetchedAt: "2026-11-21T21:37:15.610Z",
};
