// STUB (owned by AI agent): reduce RoomPlan CapturedRoom/CapturedStructure JSON to a tiny summary.
import type { RoomSummary } from "../contracts";

export const EMPTY_ROOM: RoomSummary = {
  source: "none",
  hasToilet: false,
  hasTub: false,
  hasSink: false,
  objects: [],
  wallCount: 0,
  doorCount: 0,
  approxFloorM2: null,
};

export function summarizeRoom(json: unknown, source: "scan" | "sample" = "scan"): RoomSummary {
  return { ...EMPTY_ROOM, source };
}

/** Short plain-text description for prompts, e.g. "Room scan: toilet (0.4 x 0.7 x 0.8 m), bathtub ...". */
export function describeRoom(room: RoomSummary): string {
  return room.source === "none" ? "No room scan available." : `Room scan found: ${room.objects.map((o) => o.category).join(", ")}.`;
}
