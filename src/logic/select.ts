// STUB (owned by logic agent): pick 1-3 suggestions from Decision output + intake.
import type { DecisionOutput, IntakeAnswers, RoomSummary, Suggestion } from "../contracts";

export function selectFixtures(decision: DecisionOutput, intake: IntakeAnswers, room: RoomSummary): Suggestion[] {
  return [
    { fixtureId: "toilet_grab_bar", strength: "strong", score: 0.9 },
    { fixtureId: "shower_seat", strength: "recommended", score: 0.7 },
    { fixtureId: "nonslip_mat", strength: "consider", score: 0.55 },
  ];
}

/** Fixtures the model believes are already installed (shown as "Already in place"). */
export function alreadyInPlace(decision: DecisionOutput): string[] {
  return [];
}
