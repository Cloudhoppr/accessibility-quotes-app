// Orchestrates the analysis step: Decision 1 (or recorded results) -> suggestions -> background preview.
import type { DecisionOutput, FixtureId, Result, Session } from "../contracts";
import { HAS_KEY } from "../config";
import { assessBathroom } from "../ai/decision";
import { sleep } from "../ai/withFallback";
import { SAMPLE_DECISION, SAMPLE_PHOTOS } from "../data/sample";
import { selectFixtures } from "../logic/select";
import { runPreview } from "./runPreview";

type SetSession = (patch: Partial<Session> | ((prev: Session) => Partial<Session>)) => void;

/** 0 "Looking at your bathroom", 1 "Checking 7 fixtures", 2 "Choosing what will help most". */
export type AnalysisStage = 0 | 1 | 2;

/** Use bundled recorded results: Demo Mode, or the sample bathroom when no API key is built in. */
export function shouldUseRecorded(s: Session): boolean {
  if (s.demoMode) return true;
  return !HAS_KEY && s.photos.length > 0 && s.photos.every((p) => p.source === "sample");
}

let runSeq = 0;

export interface AnalysisOutcome {
  decision: Result<DecisionOutput>;
  recorded: boolean;
  stale: boolean; // a newer run started; caller should ignore this one
}

export async function runAnalysis(
  s: Session,
  set: SetSession,
  onStage: (stage: AnalysisStage) => void
): Promise<AnalysisOutcome> {
  const id = ++runSeq;
  const isCurrent = () => id === runSeq;
  const stage = (n: AnalysisStage) => isCurrent() && onStage(n);
  const recorded = shouldUseRecorded(s);
  const photos = s.photos.length ? s.photos : recorded ? SAMPLE_PHOTOS : [];
  const started = Date.now();

  let decision: Result<DecisionOutput>;
  stage(0);
  if (recorded) {
    await sleep(1400);
    stage(1);
    await sleep(1500);
    decision = { source: "fallback", value: SAMPLE_DECISION, ms: Date.now() - started, error: "demo" };
  } else {
    const timer = setTimeout(() => stage(1), 1200);
    decision = await assessBathroom({ photos, room: s.room, intake: s.intake });
    clearTimeout(timer);
    // Keep the "checking" step visible a moment even when the answer is instant.
    const elapsed = Date.now() - started;
    if (elapsed < 2400) {
      stage(1);
      await sleep(2400 - elapsed);
    }
  }
  stage(2);

  if (!isCurrent()) return { decision, recorded, stale: true };

  let suggestions = selectFixtures(decision.value, s.intake, s.room);
  if (!suggestions.length) suggestions = [{ fixtureId: "nonslip_mat", strength: "consider", score: 0.5 }];
  const selected: FixtureId[] = suggestions.map((x) => x.fixtureId);

  set((prev) =>
    prev.step !== "analyzing"
      ? {}
      : {
          decision,
          suggestions,
          selected,
          livePrices: null,
          preview: { fixtureId: null, state: "idle", beforeUri: null, afterUri: null },
        }
  );

  // Fire and forget: the preview fills in on the suggestions screen when it is ready.
  void runPreview({ decision, suggestions, photos, recorded, set });

  await sleep(recorded ? 1200 : 900);
  return { decision, recorded, stale: !isCurrent() };
}
