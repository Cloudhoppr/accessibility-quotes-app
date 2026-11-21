// STUB (owned by logic agent): deterministic fallback when Decision 1 is unavailable.
import type { DecisionOutput, FixtureAssessment, FixtureId, IntakeAnswers, Photo, RoomSummary } from "../contracts";
import { FIXTURE_IDS } from "../fixtures";

export function ruleBasedDecision(intake: IntakeAnswers, room: RoomSummary, photos: Photo[]): DecisionOutput {
  const assessments = {} as Record<FixtureId, FixtureAssessment>;
  for (const id of FIXTURE_IDS) {
    assessments[id] = { fixtureId: id, status: "needed", pNeeded: 0.7, pInstalled: 0.1, confidence: 0.7 };
  }
  return { isBathroomProb: 0.9, assessments };
}
