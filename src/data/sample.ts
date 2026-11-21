// STUB (owned by data agent): the bundled "Sample bathroom" used by "Try a sample bathroom" and Demo Mode.
// Real content comes from the author's RoomPlan export + cleaned screenshots + recorded AI results.
import { Image } from "react-native";
import type { DecisionOutput, FixtureAssessment, FixtureId, LivePrices, Photo, RoomSummary } from "../contracts";
import { FIXTURE_IDS } from "../fixtures";

const asset = (m: number) => Image.resolveAssetSource(m)?.uri ?? "";

export const SAMPLE_ROOM: RoomSummary = {
  source: "sample",
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

export const SAMPLE_PHOTOS: Photo[] = [
  { slot: "toilet", uri: asset(require("../../assets/icon.png")), base64: "", width: 1024, height: 1024, source: "sample" },
  { slot: "bath", uri: asset(require("../../assets/icon.png")), base64: "", width: 1024, height: 1024, source: "sample" },
];

const a = (fixtureId: FixtureId, status: FixtureAssessment["status"], pNeeded: number, pInstalled: number): FixtureAssessment => ({
  fixtureId,
  status,
  pNeeded,
  pInstalled,
  confidence: Math.max(pNeeded, pInstalled, 1 - pNeeded - pInstalled),
});

export const SAMPLE_DECISION: DecisionOutput = {
  isBathroomProb: 0.97,
  assessments: Object.fromEntries(FIXTURE_IDS.map((id) => [id, a(id, "not_needed", 0.2, 0.1)])) as Record<FixtureId, FixtureAssessment>,
};
Object.assign(SAMPLE_DECISION.assessments, {
  toilet_grab_bar: a("toilet_grab_bar", "needed", 0.91, 0.04),
  tub_shower_grab_bar: a("tub_shower_grab_bar", "needed", 0.86, 0.06),
  shower_seat: a("shower_seat", "needed", 0.72, 0.05),
  nonslip_mat: a("nonslip_mat", "needed", 0.64, 0.2),
  lever_handles: a("lever_handles", "already_installed", 0.1, 0.82),
});

/** Pre-rendered "after" images keyed by fixture (bundled asset uris). */
export const SAMPLE_PREVIEWS: Partial<Record<FixtureId, string>> = {};

/** Recorded live price response, used when Demo Mode is on. null = show saved prices. */
export const SAMPLE_LIVE_PRICES: LivePrices | null = null;
