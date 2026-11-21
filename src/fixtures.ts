// FROZEN fixture catalog. Only the orchestrator edits this file.
// Every consumer (Decision questions, previews, prices, UI cards) keys off FixtureId.
import type { FixtureId, IntakeAnswers, PhotoSlot, RoomSummary } from "./contracts";

export interface Fixture {
  id: FixtureId;
  label: string; // short card title
  icon: string; // MaterialCommunityIcons name
  oneLiner: string; // plain-English description
  photoSlot: PhotoSlot; // which photo shows where it would go
  /** Whether the fixture makes sense for this room at all. */
  applies: (room: RoomSummary) => boolean;
  /** Decision 1 `choice` question text. Must stand alone: the model never sees keys. */
  decisionQuestion: string;
  /** Nano Banana edit instruction for the photo in `photoSlot`. */
  editPrompt: string;
  /** Template text shown on the card. */
  why: (intake: IntakeAnswers) => string;
  where: string;
}

const KEEP =
  " Keep everything else in the photo exactly the same: same room, layout, lighting, colors, camera angle and objects. Make it look like a real photo of a professionally installed fixture.";

export const FIXTURES: Record<FixtureId, Fixture> = {
  toilet_grab_bar: {
    id: "toilet_grab_bar",
    label: "Grab bar by the toilet",
    icon: "human-handsup",
    oneLiner: "A sturdy bar on the wall beside the toilet to hold while sitting down and standing up.",
    photoSlot: "toilet",
    applies: (r) => r.hasToilet || r.source === "none",
    decisionQuestion:
      "Look at the toilet area in the photos. Is there already a wall-mounted grab bar right next to the toilet? If not, would an older adult benefit from one there to sit down and stand up safely?",
    editPrompt:
      "Add a 42-inch brushed stainless steel grab bar mounted horizontally on the wall directly beside the toilet, about 34 inches above the floor." +
      KEEP,
    why: (i) =>
      i.mobility === "independent"
        ? "Most bathroom falls happen while sitting down or standing up. A bar gives a safe handhold."
        : "Sitting down and standing up is the riskiest moment. A fixed bar takes weight that a towel rail or sink edge can't.",
    where: "On the side wall next to the toilet, 33–36 in. above the floor, at least 42 in. long.",
  },
  tub_shower_grab_bar: {
    id: "tub_shower_grab_bar",
    label: "Grab bar in the tub or shower",
    icon: "shower",
    oneLiner: "A bar on the tub or shower wall to steady yourself on wet surfaces.",
    photoSlot: "bath",
    applies: () => true,
    decisionQuestion:
      "Look at the bathtub or shower in the photos. Is there already a grab bar mounted on the tub or shower wall? If not, would an older adult benefit from one to step in and out and stand steadily?",
    editPrompt:
      "Add a 24-inch brushed stainless steel grab bar mounted on the bathtub or shower wall, angled slightly, about 34 inches above the tub floor near the entry point." +
      KEEP,
    why: (i) =>
      i.worries.includes("tub_transfer")
        ? "You said getting in and out of the tub is a worry. A bar at the entry gives a firm handhold on wet surfaces."
        : "Wet tub floors are where many bathroom falls happen. A bar gives a firm handhold when stepping in and out.",
    where: "On the long back wall of the tub, 33–36 in. above the tub floor, plus a short vertical bar by the entry.",
  },
  shower_seat: {
    id: "shower_seat",
    label: "Shower seat",
    icon: "seat",
    oneLiner: "A sturdy seat in the tub or shower so you can wash sitting down.",
    photoSlot: "bath",
    applies: () => true,
    decisionQuestion:
      "Look at the bathtub or shower in the photos. Is there already a shower seat, bench or stool inside it? If not, would an older adult with limited balance benefit from one?",
    editPrompt:
      "Add a white freestanding shower seat with aluminum legs and a backrest inside the bathtub or shower." + KEEP,
    why: (i) =>
      i.mobility === "independent"
        ? "Sitting while washing removes the need to balance on one foot on a wet surface."
        : "With a cane, walker or wheelchair, standing to wash is tiring and risky. A seat makes showering safer and easier.",
    where: "Inside the tub or shower, against the back wall, within reach of the controls.",
  },
  raised_toilet_seat: {
    id: "raised_toilet_seat",
    label: "Raised toilet seat",
    icon: "toilet",
    oneLiner: "A seat that adds 3–5 inches of height so sitting and standing take less effort.",
    photoSlot: "toilet",
    applies: (r) => r.hasToilet || r.source === "none",
    decisionQuestion:
      "Look at the toilet in the photos. Does it already have a raised seat or a seat with armrests? If not, would an older adult with weak legs or hips benefit from a raised toilet seat?",
    editPrompt:
      "Replace the toilet seat with a white raised toilet seat about 4 inches tall that has padded armrests on both sides." +
      KEEP,
    why: (i) =>
      i.worries.includes("sit_stand") || i.mobility !== "independent"
        ? "A higher seat means less bending at the knees and hips, which makes standing up much easier."
        : "A higher seat reduces strain on knees and hips when sitting and standing.",
    where: "Fits on the existing toilet bowl. No tools or drilling for most models.",
  },
  handheld_shower: {
    id: "handheld_shower",
    label: "Handheld shower head",
    icon: "shower-head",
    oneLiner: "A shower head on a hose so you can wash while seated.",
    photoSlot: "bath",
    applies: () => true,
    decisionQuestion:
      "Look at the shower head in the photos. Is there already a handheld shower head on a hose? If it is a fixed shower head, would an older adult who washes seated benefit from a handheld one?",
    editPrompt:
      "Replace the shower head with a chrome handheld shower head on a long flexible hose with a vertical slide bar mounted on the wall." +
      KEEP,
    why: () => "Pairs with a shower seat: you can wash fully while sitting instead of turning under a fixed spray.",
    where: "Replaces the existing shower head, with a slide bar so the height can be adjusted.",
  },
  nonslip_mat: {
    id: "nonslip_mat",
    label: "Non-slip mat and strips",
    icon: "texture-box",
    oneLiner: "Grippy strips in the tub and a rubber-backed mat outside it.",
    photoSlot: "bath",
    applies: () => true,
    decisionQuestion:
      "Look at the tub or shower floor and the bathroom floor in the photos. Are there already non-slip strips, a suction mat in the tub, or a rubber-backed bath mat? If not, would an older adult benefit from them?",
    editPrompt:
      "Add clear anti-slip adhesive strips on the bathtub floor and a grey rubber-backed bath mat on the floor right outside the tub." +
      KEEP,
    why: (i) =>
      i.worries.includes("slipping")
        ? "You said slipping is a worry. This is the cheapest, fastest fix in the room."
        : "The cheapest, fastest fix in the bathroom. Wet tile and tub floors are the most common place to slip.",
    where: "Strips across the tub floor; mat on the floor where you step out.",
  },
  lever_handles: {
    id: "lever_handles",
    label: "Lever faucet handles",
    icon: "faucet",
    oneLiner: "Lever-style taps that work with a push instead of a tight grip and twist.",
    photoSlot: "other",
    applies: (r) => r.hasSink || r.source === "none",
    decisionQuestion:
      "Look at the sink and shower faucet handles in the photos. Are they already lever-style handles? If they are round knobs that need gripping and twisting, would an older adult with weak hands benefit from lever handles?",
    editPrompt: "Replace the sink faucet with a single chrome lever-handle faucet." + KEEP,
    why: (i) =>
      i.worries.includes("gripping")
        ? "You said gripping and turning is hard. Levers work with a push of the wrist or palm."
        : "Round knobs are hard to turn with arthritis or wet hands. Levers work with a push.",
    where: "Replaces the existing sink (and optionally shower) faucet handles.",
  },
};

export const FIXTURE_IDS = Object.keys(FIXTURES) as FixtureId[];

export const STRENGTH_LABEL = {
  strong: "Strongly recommended",
  recommended: "Recommended",
  consider: "Worth considering",
} as const;
