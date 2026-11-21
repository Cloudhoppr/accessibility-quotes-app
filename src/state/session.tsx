// FROZEN session store API: { s, set, go, reset }. Screens read/write the session only through this.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Session, Step } from "../contracts";
import { EMPTY_ROOM } from "../scan/summarizeRoom";

export const INITIAL_SESSION: Session = {
  step: "welcome",
  demoMode: false,
  intake: { forWhom: "parent", mobility: "cane_walker", worries: [] },
  room: EMPTY_ROOM,
  scanJsonUri: null,
  photos: [],
  decision: null,
  suggestions: [],
  selected: [],
  preview: { fixtureId: null, state: "idle", beforeUri: null, afterUri: null },
  livePrices: null,
};

interface Ctx {
  s: Session;
  /** Shallow-merge a patch, or derive one from the latest state. */
  set: (patch: Partial<Session> | ((prev: Session) => Partial<Session>)) => void;
  go: (step: Step) => void;
  reset: (keepDemoMode?: boolean) => void;
}

const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Session>(INITIAL_SESSION);
  const set = useCallback<Ctx["set"]>(
    (patch) => setS((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) })),
    []
  );
  const go = useCallback((step: Step) => setS((prev) => ({ ...prev, step })), []);
  const reset = useCallback(
    (keepDemoMode = true) => setS((prev) => ({ ...INITIAL_SESSION, demoMode: keepDemoMode ? prev.demoMode : false })),
    []
  );
  const value = useMemo(() => ({ s, set, go, reset }), [s, set, go, reset]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession(): Ctx {
  const c = useContext(SessionCtx);
  if (!c) throw new Error("useSession outside SessionProvider");
  return c;
}
