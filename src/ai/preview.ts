// Nano Banana photo edit. Resolves to a local file uri of the edited image, or null. Never throws.
// The REST/parse logic lives in ./gemini (pure TS); this file only adds the expo-file-system cache write.
import { File, Paths } from "expo-file-system";
import { GEMINI_API_KEY, HAS_KEY, TIMEOUTS } from "../config";
import type { FixtureId, Photo, Result } from "../contracts";
import { FIXTURES } from "../fixtures";
import { editImage } from "./gemini";
import { withFallback } from "./withFallback";

export async function renderPreview(args: { photo: Photo; fixtureId: FixtureId }): Promise<Result<string | null>> {
  return withFallback<string | null>(async () => {
    if (!HAS_KEY) throw new Error("no API key");
    if (!args.photo?.base64) throw new Error("photo has no base64 (sample photo)");
    const out = await editImage({
      apiKey: GEMINI_API_KEY,
      prompt: FIXTURES[args.fixtureId].editPrompt,
      jpegBase64: args.photo.base64,
      timeoutMs: TIMEOUTS.imageMs,
      label: "preview",
    });
    const ext = out.mimeType.includes("jpeg") || out.mimeType.includes("jpg") ? "jpg" : "png";
    const file = new File(Paths.cache, `preview-${args.fixtureId}-${Date.now()}.${ext}`);
    try {
      file.create({ overwrite: true });
    } catch {
      // write() creates the file if needed on most platforms; ignore.
    }
    await file.write(out.data, { encoding: "base64" });
    return file.uri;
  }, null);
}
