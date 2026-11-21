// STUB (owned by AI agent): Nano Banana photo edit. Resolves to a local file uri of the edited image, or null. Never throws.
import type { FixtureId, Photo, Result } from "../contracts";
import { withFallback } from "./withFallback";

export async function renderPreview(args: { photo: Photo; fixtureId: FixtureId }): Promise<Result<string | null>> {
  return withFallback<string | null>(async () => {
    throw new Error("not implemented");
  }, null);
}
