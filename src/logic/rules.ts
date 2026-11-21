// Deterministic fallback when Decision 1 is unavailable (no key, timeout, bad JSON).
import type { DecisionOutput, FixtureAssessment, FixtureId, IntakeAnswers, Photo, RoomSummary } from "../contracts";
import { FIXTURE_IDS } from "../fixtures";

// Varied "needed" probabilities so the fallback doesn't look like a flat stub.
const NEEDED_P: Record<FixtureId, number> = {
  toilet_grab_bar: 0.84,
  tub_shower_grab_bar: 0.81,
  shower_seat: 0.76,
  raised_toilet_seat: 0.72,
  handheld_shower: 0.7,
  nonslip_mat: 0.78,
  lever_handles: 0.73,
};

export function ruleBasedDecision(intake: IntakeAnswers, room: RoomSummary, _photos: Photo[]): DecisionOutput {
  const noScan = room.source === "none";
  const hasToilet = noScan || room.hasToilet;
  const hasTub = noScan || room.hasTub;
  const assisted = intake.mobility !== "independent";
  const w = new Set(intake.worries);

  const showerSeat = hasTub && assisted;
  const needed: Record<FixtureId, boolean> = {
    toilet_grab_bar: hasToilet || assisted,
    raised_toilet_seat: assisted || w.has("sit_stand"),
    tub_shower_grab_bar: hasTub,
    shower_seat: showerSeat,
    handheld_shower: showerSeat,
    nonslip_mat: true,
    lever_handles: w.has("gripping"),
  };

  const assessments = {} as Record<FixtureId, FixtureAssessment>;
  for (const id of FIXTURE_IDS) {
    if (needed[id]) {
      const pNeeded = NEEDED_P[id];
      const pInstalled = 0.05;
      assessments[id] = { fixtureId: id, status: "needed", pNeeded, pInstalled, confidence: 0.6 };
    } else {
      assessments[id] = { fixtureId: id, status: "not_needed", pNeeded: 0.25, pInstalled: 0.05, confidence: 0.55 };
    }
  }
  return { isBathroomProb: 0.9, assessments };
}
