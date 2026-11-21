// FROZEN shared types. Only the orchestrator edits this file.

export type FixtureId =
  | "toilet_grab_bar"
  | "tub_shower_grab_bar"
  | "shower_seat"
  | "raised_toilet_seat"
  | "handheld_shower"
  | "nonslip_mat"
  | "lever_handles";

export type ForWhom = "self" | "parent" | "care";
export type Mobility = "independent" | "cane_walker" | "wheelchair";
export type Worry = "sit_stand" | "tub_transfer" | "slipping" | "gripping";

export interface IntakeAnswers {
  forWhom: ForWhom;
  mobility: Mobility;
  worries: Worry[]; // multi-select, may be empty
}

export interface RoomObject {
  category: string; // "toilet" | "bathtub" | "sink" | "storage" | ...
  w: number; // meters
  d: number;
  h: number;
}

export interface RoomSummary {
  source: "scan" | "sample" | "none";
  hasToilet: boolean;
  hasTub: boolean;
  hasSink: boolean;
  objects: RoomObject[];
  wallCount: number;
  doorCount: number;
  approxFloorM2: number | null;
}

export type PhotoSlot = "toilet" | "bath" | "other";

export interface Photo {
  slot: PhotoSlot;
  uri: string; // local file uri (resized JPEG) or bundled asset uri
  base64: string; // JPEG base64, ~1024px long edge, no data: prefix
  width: number;
  height: number;
  source: "camera" | "library" | "sample";
}

export type FixtureStatus = "needed" | "already_installed" | "not_needed";

export interface FixtureAssessment {
  fixtureId: FixtureId;
  status: FixtureStatus; // top choice
  pNeeded: number; // 0..1
  pInstalled: number; // 0..1
  confidence: number; // 0..1
}

export interface DecisionOutput {
  isBathroomProb: number; // 0..1
  assessments: Record<FixtureId, FixtureAssessment>;
}

export type Strength = "strong" | "recommended" | "consider";

export interface Suggestion {
  fixtureId: FixtureId;
  strength: Strength;
  score: number; // pNeeded after intake boosts, 0..1
}

export interface PreviewState {
  fixtureId: FixtureId | null;
  state: "idle" | "loading" | "ready" | "failed";
  beforeUri: string | null;
  afterUri: string | null; // local file uri or bundled asset uri
}

export interface PriceSource {
  title: string;
  url: string;
}

export interface PriceEntry {
  displayName: string;
  partsLow: number; // USD
  partsHigh: number;
  laborLow: number;
  laborHigh: number;
  unit: string; // e.g. "each", "set"
  defaultQty: number;
  sources: PriceSource[];
}

export interface PricesFile {
  gatheredOn: string; // YYYY-MM-DD
  location: string; // "Chelsea, Manhattan, New York, NY"
  contractor: string;
  currency: "USD";
  method: string; // one-line description of how prices were gathered
  items: Record<FixtureId, PriceEntry>;
}

export interface LivePrices {
  items: Partial<Record<FixtureId, { low: number; high: number }>>; // installed total per unit
  sources: PriceSource[];
  fetchedAt: string; // ISO
}

export interface EstimateLine {
  fixtureId: FixtureId;
  name: string;
  qty: number;
  low: number; // installed total for qty, USD
  high: number;
  live: boolean; // true if the live Gemini 4 price replaced the saved one
}

export interface Estimate {
  lines: EstimateLine[];
  totalLow: number;
  totalHigh: number;
  priceSource: "live" | "saved";
  sources: PriceSource[];
  contractor: string;
  location: string;
  gatheredOn: string;
}

/** Every AI call resolves to this, never throws. */
export interface Result<T> {
  source: "live" | "fallback";
  value: T;
  ms: number;
  error?: string;
}

export interface AiCallLog {
  at: string; // ISO
  label: string; // "decision" | "preview" | "prices" | ...
  model: string;
  status: number | "timeout" | "network";
  ms: number;
  bytesSent: number;
  error?: string;
}

export type Step =
  | "welcome"
  | "intake"
  | "scan"
  | "photos"
  | "analyzing"
  | "suggestions"
  | "estimate";

export interface Session {
  step: Step;
  demoMode: boolean; // forces sample bathroom + recorded results
  intake: IntakeAnswers;
  room: RoomSummary;
  scanJsonUri: string | null;
  photos: Photo[];
  decision: Result<DecisionOutput> | null;
  suggestions: Suggestion[];
  selected: FixtureId[];
  preview: PreviewState;
  livePrices: Result<LivePrices | null> | null;
}
