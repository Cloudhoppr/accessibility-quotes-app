// STUB (owned by AI agent): Gemini Decision 1 call. Never throws.
import type { DecisionOutput, IntakeAnswers, Photo, Result, RoomSummary } from "../contracts";
import { ruleBasedDecision } from "../logic/rules";
import { withFallback } from "./withFallback";

export async function assessBathroom(args: {
  photos: Photo[];
  room: RoomSummary;
  intake: IntakeAnswers;
}): Promise<Result<DecisionOutput>> {
  return withFallback<DecisionOutput>(
    async () => {
      throw new Error("not implemented");
    },
    () => ruleBasedDecision(args.intake, args.room, args.photos)
  );
}
