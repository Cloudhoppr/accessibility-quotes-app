// @ts-nocheck -- Node-only dev script (no @types/node in this app); run with npx tsx.
// Offline check of summarizeRoom/describeRoom:  npx tsx scripts/test-room.ts [path/to/roomplan.json]
// With no argument, uses every *.json in assets/demo/ plus a synthetic CapturedRoom and garbage inputs.
import * as fs from "fs";
import * as path from "path";
import { describeRoom, summarizeRoom } from "../src/scan/summarizeRoom";

const ROOT = path.resolve(__dirname, "..");

const synthetic = {
  identifier: "X",
  version: 2,
  walls: [2.1, 2.4, 2.1, 2.4].map((w) => ({ category: { wall: {} }, dimensions: [w, 2.5, 0], confidence: { high: {} } })),
  doors: [{ category: { door: { isOpen: false } }, dimensions: [0.8, 2.0, 0] }],
  windows: [],
  openings: [],
  floors: [
    {
      category: { floor: {} },
      dimensions: [2.1, 2.4, 0],
      polygonCorners: [
        [-1.05, -1.2, 0],
        [1.05, -1.2, 0],
        [1.05, 1.2, 0],
        [-1.05, 1.2, 0],
      ],
    },
  ],
  objects: [
    { category: { toilet: {} }, dimensions: [0.4123, 0.78, 0.7] },
    { category: { bathtub: {} }, dimensions: [1.52, 0.56, 0.76] },
    { category: { sink: {} }, dimensions: [0.6, 0.86, 0.45] },
  ],
};
const structure = { rooms: [{ ...synthetic, floors: [] }], sections: [] };

function show(name: string, json: unknown) {
  const s = summarizeRoom(json, "scan");
  console.log(`\n== ${name}\n${JSON.stringify(s)}\n${describeRoom(s)}`);
}

const arg = process.argv[2];
if (arg) show(arg, fs.readFileSync(arg, "utf8"));
else {
  show("synthetic CapturedRoom", synthetic);
  show("synthetic CapturedStructure (no floors -> wall heuristic)", structure);
  show("garbage string", "not json");
  show("null", null);
  show("weird", { walls: "nope", objects: [{ category: 5 }] });
  const demo = path.join(ROOT, "assets", "demo");
  for (const f of fs.existsSync(demo) ? fs.readdirSync(demo).filter((x) => x.endsWith(".json")) : [])
    show(`assets/demo/${f}`, fs.readFileSync(path.join(demo, f), "utf8"));
}
