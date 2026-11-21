// Pick 1-3 suggestions from Decision output + intake.
import type { DecisionOutput, FixtureId, IntakeAnswers, RoomSummary, Strength, Suggestion } from "../contracts";
import { FIXTURE_IDS } from "../fixtures";

function boost(id: FixtureId, intake: IntakeAnswers): number {
  const w = new Set(intake.worries);
  let b = 0;
  if (intake.mobility !== "independent" && (id === "shower_seat" || id === "handheld_shower")) b += 0.1;
  if (w.has("sit_stand") && (id === "raised_toilet_seat" || id === "toilet_grab_bar")) b += 0.1;
  if (w.has("tub_transfer") && id === "tub_shower_grab_bar") b += 0.1;
  if (w.has("slipping") && id === "nonslip_mat") b += 0.1;
  if (w.has("gripping") && id === "lever_handles") b += 0.15;
  return b;
}

function strengthOf(score: number): Strength {
  if (score >= 0.8) return "strong";
  if (score >= 0.6) return "recommended";
  return "consider";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function selectFixtures(decision: DecisionOutput, intake: IntakeAnswers, _room: RoomSummary): Suggestion[] {
  const all = FIXTURE_IDS.map((id) => decision.assessments[id]).filter(Boolean);

  const candidates = all
    .filter((a) => a.status !== "already_installed" && (a.status === "needed" || a.pNeeded >= 0.5))
    .map((a) => ({ fixtureId: a.fixtureId, score: Math.min(0.99, a.pNeeded + boost(a.fixtureId, intake)) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 3);

  if (candidates.length === 0) {
    const fallback = all
      .filter((a) => a.status !== "already_installed")
      .sort((x, y) => y.pNeeded - x.pNeeded)[0];
    const fixtureId: FixtureId = fallback?.fixtureId ?? "nonslip_mat";
    const score = Math.min(0.99, (fallback?.pNeeded ?? 0.5) + boost(fixtureId, intake));
    return [{ fixtureId, strength: strengthOf(score), score: round2(score) }];
  }

  return candidates.map((c) => ({ fixtureId: c.fixtureId, strength: strengthOf(c.score), score: round2(c.score) }));
}

/** Fixtures the model believes are already installed (shown as "Already in place"). */
export function alreadyInPlace(decision: DecisionOutput): string[] {
  return FIXTURE_IDS.filter((id) => {
    const a = decision.assessments[id];
    return !!a && (a.status === "already_installed" || a.pInstalled >= 0.6);
  });
}
