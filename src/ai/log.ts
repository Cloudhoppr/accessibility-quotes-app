// In-memory ring buffer of AI calls, shown on the hidden debug screen.
import type { AiCallLog } from "../contracts";

const MAX = 25;
const entries: AiCallLog[] = [];
const listeners = new Set<() => void>();

export function logCall(e: AiCallLog) {
  entries.unshift(e);
  if (entries.length > MAX) entries.pop();
  listeners.forEach((l) => l());
}

export function getCallLog(): AiCallLog[] {
  return entries.slice();
}

export function subscribeCallLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
