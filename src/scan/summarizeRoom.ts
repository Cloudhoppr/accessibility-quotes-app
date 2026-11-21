// Reduce Apple RoomPlan CapturedRoom / CapturedStructure JSON (Codable encoding) to a tiny summary.
// Tolerant: never throws; anything unexpected yields EMPTY_ROOM with the given source. Pure TS.
import type { RoomObject, RoomSummary } from "../contracts";

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

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const r2 = (n: number) => Math.round(n * 100) / 100;
const isNum = (n: unknown): n is number => typeof n === "number" && isFinite(n);

/** Codable enums encode as {"toilet":{}} (or {"door":{"isOpen":true}}); tolerate plain strings too. */
function categoryName(c: unknown): string {
  if (typeof c === "string") return c;
  if (c && typeof c === "object") {
    const k = Object.keys(c as object)[0];
    if (k) return k;
  }
  return "unknown";
}

/** simd_float3 encodes as [x,y,z]; tolerate {x,y,z} too. */
function vec3(v: unknown): [number, number, number] | null {
  if (Array.isArray(v) && v.length >= 2 && v.slice(0, 3).every(isNum)) return [v[0], v[1], isNum(v[2]) ? v[2] : 0];
  if (v && typeof v === "object") {
    const o = v as any;
    if (isNum(o.x) && isNum(o.y)) return [o.x, o.y, isNum(o.z) ? o.z : 0];
  }
  return null;
}

function polygonArea(corners: unknown): number | null {
  const pts = arr(corners).map(vec3).filter(Boolean) as [number, number, number][];
  if (pts.length < 3) return null;
  // Shoelace in each axis-aligned plane; the floor polygon lies flat in one of them.
  const planes: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  let best = 0;
  for (const [a, b] of planes) {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      s += p[a] * q[b] - q[a] * p[b];
    }
    best = Math.max(best, Math.abs(s) / 2);
  }
  return best > 0 ? best : null;
}

function floorArea(floors: any[]): number | null {
  let total = 0;
  for (const f of floors) {
    let a = polygonArea(f?.polygonCorners);
    if (a == null) {
      const d = vec3(f?.dimensions);
      if (d) {
        const sorted = d.map(Math.abs).sort((x, y) => y - x);
        if (sorted[0] > 0 && sorted[1] > 0) a = sorted[0] * sorted[1];
      }
    }
    if (a != null) total += a;
  }
  return total > 0 ? total : null;
}

function parseInput(json: unknown): any {
  if (typeof json === "string") return JSON.parse(json);
  return json;
}

export function summarizeRoom(json: unknown, source: "scan" | "sample" = "scan"): RoomSummary {
  try {
    const root = parseInput(json);
    if (!root || typeof root !== "object") return { ...EMPTY_ROOM, source };
    // CapturedStructure has top-level merged arrays plus rooms[]; CapturedRoom has the arrays directly.
    const rooms = arr(root.rooms);
    const pick = (key: string): any[] => {
      const top = arr(root[key]);
      if (top.length > 0 || rooms.length === 0) return top;
      return rooms.flatMap((r: any) => arr(r?.[key]));
    };
    const walls = pick("walls");
    const doors = pick("doors");
    const objectsRaw = pick("objects");
    const floors = pick("floors");

    const objects: RoomObject[] = [];
    for (const o of objectsRaw) {
      const d = vec3(o?.dimensions);
      // RoomPlan object dimensions are (width, height, depth) in meters.
      objects.push({
        category: categoryName(o?.category),
        w: d ? r2(Math.abs(d[0])) : 0,
        h: d ? r2(Math.abs(d[1])) : 0,
        d: d ? r2(Math.abs(d[2])) : 0,
      });
    }
    const cats = new Set(objects.map((o) => o.category.toLowerCase()));

    let approx = floorArea(floors);
    if (approx == null && walls.length >= 3) {
      // Heuristic: perimeter from wall widths, assume a roughly square room.
      const perimeter = walls.reduce((s: number, w: any) => s + Math.abs(vec3(w?.dimensions)?.[0] ?? 0), 0);
      if (perimeter > 0) approx = (perimeter / 4) ** 2;
    }

    if (walls.length === 0 && objects.length === 0 && doors.length === 0) return { ...EMPTY_ROOM, source };
    return {
      source,
      hasToilet: cats.has("toilet"),
      hasTub: cats.has("bathtub") || cats.has("tub") || cats.has("shower"),
      hasSink: cats.has("sink"),
      objects,
      wallCount: walls.length,
      doorCount: doors.length,
      approxFloorM2: approx != null ? r2(approx) : null,
    };
  } catch {
    return { ...EMPTY_ROOM, source };
  }
}

/** Meters to a natural feet/inches string, e.g. 0.71 -> "2 ft 4 in", 0.3 -> "12 in". */
export function feetInches(m: number): string {
  const totalIn = Math.round(m * 39.3701);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn % 12;
  if (ft === 0) return `${inch} in`;
  return inch === 0 ? `${ft} ft` : `${ft} ft ${inch} in`;
}

const NICE: Record<string, string> = { washerDryer: "washer/dryer", bathtub: "bathtub" };

/** Plain-text description for prompts, in feet and inches. */
export function describeRoom(room: RoomSummary): string {
  if (room.source === "none") return "No room scan is available.";
  const known = room.objects.filter((o) => o.category !== "unknown");
  if (room.wallCount === 0 && known.length === 0) return "The room scan did not capture any usable detail.";
  const lead = room.source === "sample" ? "A sample room scan" : "A 3D room scan (Apple RoomPlan)";
  const shape: string[] = [];
  if (room.approxFloorM2 != null) shape.push(`about ${Math.round(room.approxFloorM2 * 10.7639)} square feet of floor`);
  if (room.wallCount) shape.push(`${room.wallCount} wall${room.wallCount === 1 ? "" : "s"}`);
  if (room.doorCount) shape.push(`${room.doorCount} door${room.doorCount === 1 ? "" : "s"}`);
  let s = `${lead} shows ${shape.length ? shape.join(", ") : "the room"}.`;
  if (known.length) {
    const items = known.map((o) => {
      const name = NICE[o.category] ?? o.category;
      return o.w || o.d || o.h
        ? `a ${name} (${feetInches(o.w)} wide, ${feetInches(o.d)} deep, ${feetInches(o.h)} tall)`
        : `a ${name}`;
    });
    s += ` It found ${items.join("; ")}.`;
  } else {
    s += " It found no fixtures or furniture.";
  }
  const missing = [!room.hasToilet && "toilet", !room.hasTub && "bathtub", !room.hasSink && "sink"].filter(Boolean);
  if (missing.length) s += ` No ${missing.join(" or ")} was detected.`;
  return s;
}
