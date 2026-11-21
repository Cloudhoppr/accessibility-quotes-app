// Gemini Decision 1 call. Never throws. Pure TS (importable from Node).
import { API_BASE, DECISION_MODEL, GEMINI_API_KEY, HAS_KEY, TIMEOUTS } from "../config";
import type {
  DecisionOutput,
  FixtureAssessment,
  FixtureId,
  FixtureStatus,
  IntakeAnswers,
  Photo,
  PhotoSlot,
  Result,
  RoomSummary,
} from "../contracts";
import { FIXTURE_IDS, FIXTURES } from "../fixtures";
import { ruleBasedDecision } from "../logic/rules";
import { describeRoom } from "../scan/summarizeRoom";
import { postJson } from "./http";
import { withFallback } from "./withFallback";

const FOR_WHOM: Record<IntakeAnswers["forWhom"], string> = {
  self: "The person filling this in is an older adult making their own bathroom safer.",
  parent: "The person filling this in is making the bathroom safer for an older parent.",
  care: "The person filling this in is a caregiver making the bathroom safer for an older adult they care for.",
};
const MOBILITY: Record<IntakeAnswers["mobility"], string> = {
  independent: "The older adult walks independently.",
  cane_walker: "The older adult uses a cane or walker.",
  wheelchair: "The older adult uses a wheelchair.",
};
const WORRY: Record<IntakeAnswers["worries"][number], string> = {
  sit_stand: "sitting down and standing up from the toilet",
  tub_transfer: "getting in and out of the tub or shower",
  slipping: "slipping on wet floors",
  gripping: "gripping and turning taps and handles",
};
const SLOT_LABEL: Record<PhotoSlot, string> = {
  toilet: "Photo of the toilet area:\n",
  bath: "Photo of the bathtub or shower:\n",
  other: "Photo of the sink and the rest of the bathroom:\n",
};

const CRITERIA = {
  already_installed: "This safety fixture (or an equivalent) is already installed in the bathroom.",
  needed: "It is not installed, and an older adult would be safer with it here.",
  not_needed: "It is not installed, but it would not help or does not fit this bathroom.",
};

export function intakeText(intake: IntakeAnswers): string {
  const worries = intake.worries.length
    ? `Their main worries are: ${intake.worries.map((w) => WORRY[w]).join("; ")}.`
    : "They did not name any specific worries.";
  return `${FOR_WHOM[intake.forWhom]} ${MOBILITY[intake.mobility]} ${worries}`;
}

export function buildDecisionRequest(args: { photos: Photo[]; room: RoomSummary; intake: IntakeAnswers }) {
  const input: any[] = [
    {
      type: "text",
      text:
        "These are photos of a home bathroom, taken to check which safety fixtures would help an older adult avoid falls.\n" +
        intakeText(args.intake) +
        "\n" +
        describeRoom(args.room) +
        "\n",
    },
  ];
  for (const p of args.photos) {
    if (!p.base64) continue;
    input.push({ type: "text", text: SLOT_LABEL[p.slot] ?? "Photo of the bathroom:\n" });
    input.push({ type: "image", data: p.base64, mime_type: "image/jpeg", resolution: "medium" });
  }
  const questions: Record<string, any> = {
    is_bathroom: {
      type: "noul",
      instructions: "Do these photos show a bathroom in a home (with a toilet, bathtub, shower or sink)?",
    },
  };
  const applicable = FIXTURE_IDS.filter((id) => FIXTURES[id].applies(args.room));
  for (const id of applicable) {
    questions[id] = { type: "choice", instructions: FIXTURES[id].decisionQuestion, criteria: CRITERIA };
  }
  return { body: { model: DECISION_MODEL, input, questions }, applicable };
}

const clamp01 = (n: unknown, d: number) => (typeof n === "number" && isFinite(n) ? Math.min(1, Math.max(0, n)) : d);

export function parseDecisionResponse(resp: any, applicable: FixtureId[]): DecisionOutput {
  const answers = resp?.answers;
  if (!answers || typeof answers !== "object") throw new Error("decision response has no answers");
  const assessments = {} as Record<FixtureId, FixtureAssessment>;
  let parsed = 0;
  for (const id of FIXTURE_IDS) {
    const a = applicable.includes(id) ? answers[id] : undefined;
    if (!a) {
      assessments[id] = { fixtureId: id, status: "not_needed", pNeeded: 0.02, pInstalled: 0, confidence: 0.9 };
      continue;
    }
    const probs = a.probabilities ?? {};
    const pNeeded = clamp01(probs.needed, 0);
    const pInstalled = clamp01(probs.already_installed, 0);
    const pNot = clamp01(probs.not_needed, 0);
    let status: FixtureStatus =
      a.choice === "needed" || a.choice === "already_installed" || a.choice === "not_needed" ? a.choice : "not_needed";
    if (!a.choice) status = pNeeded >= pInstalled && pNeeded >= pNot ? "needed" : pInstalled >= pNot ? "already_installed" : "not_needed";
    assessments[id] = {
      fixtureId: id,
      status,
      pNeeded,
      pInstalled,
      confidence: clamp01(a.confidence, Math.max(pNeeded, pInstalled, pNot)),
    };
    parsed++;
  }
  if (applicable.length > 0 && parsed === 0) throw new Error("decision response had no fixture answers");
  const isB = answers.is_bathroom;
  return { isBathroomProb: clamp01(isB?.noul ?? isB?.probability, 0.5), assessments };
}

/** Live call only (throws on any failure). Exposed for scripts/test-ai.ts. */
export async function assessBathroomLive(args: { photos: Photo[]; room: RoomSummary; intake: IntakeAnswers }): Promise<DecisionOutput> {
  if (!HAS_KEY) throw new Error("no API key");
  if (args.photos.length > 0 && args.photos.every((p) => !p.base64)) {
    throw new Error("sample photos have no base64; using fallback");
  }
  const { body, applicable } = buildDecisionRequest(args);
  const resp = await postJson(`${API_BASE}/v1beta/decisions`, body, {
    apiKey: GEMINI_API_KEY,
    timeoutMs: TIMEOUTS.decisionMs,
    label: "decision",
    model: DECISION_MODEL,
  });
  return parseDecisionResponse(resp, applicable);
}

export async function assessBathroom(args: {
  photos: Photo[];
  room: RoomSummary;
  intake: IntakeAnswers;
}): Promise<Result<DecisionOutput>> {
  return withFallback<DecisionOutput>(
    () => assessBathroomLive(args),
    () => ruleBasedDecision(args.intake, args.room, args.photos)
  );
}
