// Plain fetch helper for all Gemini REST calls. Pure TS: no react-native/expo imports.
import { logCall } from "./log";

export class HttpError extends Error {
  constructor(public status: number | "timeout" | "network", message: string) {
    super(message);
  }
}

export interface PostOptions {
  apiKey: string;
  timeoutMs: number;
  label: string;
  model: string;
  headers?: Record<string, string>;
}

export async function postJson<T = any>(url: string, body: unknown, opts: PostOptions): Promise<T> {
  const started = Date.now();
  const payload = JSON.stringify(body);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  let status: number | "timeout" | "network" = "network";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": opts.apiKey,
        ...(opts.headers ?? {}),
      },
      body: payload,
      signal: ctrl.signal,
    });
    status = res.status;
    const text = await res.text();
    if (!res.ok) {
      throw new HttpError(res.status, `HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    logCall({ at: new Date().toISOString(), label: opts.label, model: opts.model, status, ms: Date.now() - started, bytesSent: payload.length });
    return JSON.parse(text) as T;
  } catch (e: any) {
    if (e?.name === "AbortError") status = "timeout";
    const msg = e instanceof HttpError ? e.message : `${status}: ${String(e?.message ?? e)}`;
    logCall({ at: new Date().toISOString(), label: opts.label, model: opts.model, status, ms: Date.now() - started, bytesSent: payload.length, error: msg.slice(0, 500) });
    throw e instanceof HttpError ? e : new HttpError(status, msg);
  } finally {
    clearTimeout(timer);
  }
}
