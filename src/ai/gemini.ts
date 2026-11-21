// Pure-TS generateContent helpers (Nano Banana image edit, grounded text). No react-native/expo imports,
// so this file can be exercised from Node via scripts/test-ai.ts.
import { API_BASE, IMAGE_MODEL, IMAGE_MODEL_FALLBACK } from "../config";
import { HttpError, postJson } from "./http";

export const generateContentUrl = (model: string) => `${API_BASE}/v1beta/models/${model}:generateContent`;

export interface ImageEditOptions {
  thinking: boolean; // include thinkingConfig {thinkingLevel: "minimal"}
  imageConfig: boolean; // include imageConfig {imageSize: "1K"}
}

export function buildImageEditBody(prompt: string, jpegBase64: string, opts: ImageEditOptions = { thinking: true, imageConfig: true }) {
  const generationConfig: Record<string, unknown> = { responseModalities: ["TEXT", "IMAGE"] };
  if (opts.imageConfig) generationConfig.imageConfig = { imageSize: "1K" };
  if (opts.thinking) generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
  return {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: jpegBase64 } }],
      },
    ],
    generationConfig,
  };
}

/** Concatenated non-thought text from candidates[0]. */
export function extractText(resp: any): string {
  const parts: any[] = resp?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => typeof p?.text === "string" && !p.thought)
    .map((p) => p.text as string)
    .join("");
}

/** First non-thought inline image part, or null. */
export function extractImage(resp: any): { data: string; mimeType: string } | null {
  const parts: any[] = resp?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    if (p?.thought) continue;
    const inline = p?.inlineData ?? p?.inline_data;
    if (inline?.data) return { data: inline.data, mimeType: inline.mimeType ?? inline.mime_type ?? "image/png" };
  }
  return null;
}

export interface ImageEditResult {
  data: string; // base64
  mimeType: string;
  model: string;
  attempts: string[]; // human-readable log of what was tried
}

/**
 * Nano Banana edit with two cheap retries:
 *  - 400 (likely an unsupported config field) -> drop thinkingConfig, then imageConfig
 *  - 404 (model not available on this key)    -> switch to IMAGE_MODEL_FALLBACK
 * All attempts share one overall deadline of timeoutMs.
 */
export async function editImage(args: {
  apiKey: string;
  prompt: string;
  jpegBase64: string;
  timeoutMs: number;
  label?: string;
}): Promise<ImageEditResult> {
  const deadline = Date.now() + args.timeoutMs;
  let model = IMAGE_MODEL;
  const opts: ImageEditOptions = { thinking: true, imageConfig: true };
  const attempts: string[] = [];
  for (let i = 0; i < 4; i++) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) throw new HttpError("timeout", `image edit out of time after: ${attempts.join("; ")}`);
    const tag = `${model}${opts.thinking ? "" : " -thinking"}${opts.imageConfig ? "" : " -imageConfig"}`;
    try {
      const resp = await postJson(generateContentUrl(model), buildImageEditBody(args.prompt, args.jpegBase64, opts), {
        apiKey: args.apiKey,
        timeoutMs: remaining,
        label: args.label ?? "preview",
        model,
      });
      const img = extractImage(resp);
      if (!img) {
        const reason = resp?.candidates?.[0]?.finishReason ?? resp?.promptFeedback?.blockReason ?? "no image part";
        throw new Error(`no image returned (${reason}): ${extractText(resp).slice(0, 200)}`);
      }
      attempts.push(`${tag}: ok`);
      return { ...img, model, attempts };
    } catch (e: any) {
      const status = e instanceof HttpError ? e.status : undefined;
      attempts.push(`${tag}: ${status ?? "error"}`);
      if (status === 404 && model === IMAGE_MODEL) {
        model = IMAGE_MODEL_FALLBACK;
        continue;
      }
      if (status === 400 && opts.thinking) {
        opts.thinking = false;
        continue;
      }
      if (status === 400 && opts.imageConfig) {
        opts.imageConfig = false;
        continue;
      }
      throw e;
    }
  }
  throw new Error(`image edit failed: ${attempts.join("; ")}`);
}
