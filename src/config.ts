// Single source of truth for model IDs, keys, flags and timeouts.
// Never inline a model ID string anywhere else.

export const GEMINI_API_KEY: string = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";
export const BUILD_SHA: string = (process.env.EXPO_PUBLIC_BUILD_SHA ?? "local").slice(0, 7);

export const API_BASE = "https://generativelanguage.googleapis.com";

export const DECISION_MODEL = "gemini-decision-1";
// Gemini 4 variant used for the live, Google-Search-grounded price refresh.
export const PRICE_MODEL = "gemini-4-argon"; // fastest grounded variant in live tests (~16-20 s)
export const IMAGE_MODEL = "gemini-nano-banana-2.1";
export const IMAGE_MODEL_FALLBACK = "gemini-3.1-flash-lite-image";

export const TIMEOUTS = {
  decisionMs: 15000,
  priceMs: 60000,
  imageMs: 45000,
};

// Feature flags
export const ENABLE_PREVIEW = true; // Nano Banana before/after image
export const ENABLE_LIVE_PRICES = true; // Gemini 4 grounded price refresh

export const HAS_KEY = GEMINI_API_KEY.length > 0;
