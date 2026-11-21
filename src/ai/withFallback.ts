// Every AI call goes through this. It never throws.
import type { Result } from "../contracts";

export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T | (() => T),
  opts: { enabled?: boolean } = {}
): Promise<Result<T>> {
  const started = Date.now();
  const fb = () => (typeof fallback === "function" ? (fallback as () => T)() : fallback);
  if (opts.enabled === false) {
    return { source: "fallback", value: fb(), ms: 0, error: "disabled" };
  }
  try {
    const value = await fn();
    return { source: "live", value, ms: Date.now() - started };
  } catch (e: any) {
    return { source: "fallback", value: fb(), ms: Date.now() - started, error: String(e?.message ?? e).slice(0, 500) };
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
