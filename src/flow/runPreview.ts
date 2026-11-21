// Kicks off the Nano Banana before/after preview for the top suggestion. Never throws, never blocks.
import type { DecisionOutput, FixtureId, Photo, PreviewState, Result, Session, Suggestion } from "../contracts";
import { ENABLE_PREVIEW } from "../config";
import { FIXTURES } from "../fixtures";
import { renderPreview } from "../ai/preview";
import { sleep } from "../ai/withFallback";
import { SAMPLE_PREVIEWS } from "../data/sample";

type SetSession = (patch: Partial<Session> | ((prev: Session) => Partial<Session>)) => void;

const HIDDEN: PreviewState = { fixtureId: null, state: "idle", beforeUri: null, afterUri: null };

export function pickPreviewPhoto(fixtureId: FixtureId, photos: Photo[]): Photo | null {
  const slot = FIXTURES[fixtureId].photoSlot;
  return photos.find((p) => p.slot === slot && !!p.uri) ?? photos.find((p) => !!p.uri) ?? null;
}

/**
 * `decision` is the run token: results are only applied while the session still holds
 * this exact decision object (a reset or a newer analysis replaces it).
 */
export async function runPreview(args: {
  decision: Result<DecisionOutput>;
  suggestions: Suggestion[];
  photos: Photo[];
  recorded: boolean; // demo mode / sample without key: use bundled after images
  set: SetSession;
}): Promise<void> {
  const { decision, suggestions, photos, recorded, set } = args;
  const apply = (fixtureId: FixtureId | null, next: PreviewState) =>
    set((prev) =>
      prev.decision !== decision || (fixtureId !== null && prev.preview.fixtureId !== fixtureId) ? {} : { preview: next }
    );

  const top = suggestions[0]?.fixtureId;
  const photo = top ? pickPreviewPhoto(top, photos) : null;
  if (!ENABLE_PREVIEW || !top || !photo) {
    apply(null, HIDDEN);
    return;
  }

  const loading: PreviewState = { fixtureId: top, state: "loading", beforeUri: photo.uri, afterUri: null };
  apply(null, loading);

  try {
    if (recorded) {
      await sleep(3000);
      const uri = SAMPLE_PREVIEWS[top];
      apply(top, uri ? { ...loading, state: "ready", afterUri: uri } : { ...loading, state: "failed" });
      return;
    }
    const r = await renderPreview({ photo, fixtureId: top });
    apply(top, r.value ? { ...loading, state: "ready", afterUri: r.value } : { ...loading, state: "failed" });
  } catch {
    apply(top, { ...loading, state: "failed" });
  }
}
