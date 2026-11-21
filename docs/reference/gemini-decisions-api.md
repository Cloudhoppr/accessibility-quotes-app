# Gemini Decisions API / Gemini Decision 1 — reference notes

Paraphrased from https://aistudio.google.com/docs/models/gemini-decision-1 and
https://aistudio.google.com/docs/decisions-api (fetched 2026-11-21). Read the pages for exact text.

## What it is
- Model ID: `gemini-decision-1`. Multimodal (text, image, video, audio, PDF input).
- Answers typed questions about a shared input in one pass. Returns **probabilities only, zero output tokens**. It cannot write free text.
- Use for routing, classification, rubric scoring, yes/no checks.

## Endpoint
- `POST https://generativelanguage.googleapis.com/v1beta/decisions`
- Headers: `x-goog-api-key: <KEY>`, `Content-Type: application/json`
- JS SDK: `@google/genai` >= 3.2, `ai.decisions.create({...})`, api_version `v1beta`.

## Request body
```json
{
  "model": "gemini-decision-1",
  "input": [
    { "type": "text", "text": "Bathroom photo from an elderly user's home.\n" },
    { "type": "image", "data": "<base64>", "mime_type": "image/jpeg", "resolution": "medium" }
  ],
  "questions": {
    "needs_toilet_grab_bar": { "type": "noul", "instructions": "Is there no grab bar next to the toilet?" },
    "fall_risk": { "type": "score", "instructions": "How high is the fall risk in this room?", "criteria": ["low", "medium", "high"] },
    "room_type": { "type": "choice", "instructions": "What room is this?", "criteria": { "bathroom": "", "bedroom": "", "kitchen": "", "stairs": "", "living_room": "" } }
  }
}
```
- `input`: string, one block, or array of blocks. Adjacent text blocks join with no separator.
- `questions`: 1–1,000, keys `[A-Za-z0-9_-]{1,64}`. The model never sees keys; put the full question in `instructions` (text only).
- Types: `noul` (yes/no; optional `criteria: {true_description, false_description}`), `choice` (`criteria` = map of 2–255 option keys to descriptions; keys sorted alphabetically, so do not rely on position), `score` (`criteria` = array of 2–255 levels, low to high).
- Image block: `data` (base64) or `uri`, `mime_type` must match real format (JPEG/PNG/HEIC/…), optional `resolution`: low | medium | high | ultra_high.
- Inline limit 100 MB per request. Context 262,144 tokens.

## Response body
```json
{
  "answers": {
    "needs_toilet_grab_bar": { "type": "noul", "noul": 0.93, "confidence": 0.93 },
    "room_type": { "type": "choice", "choice": "bathroom", "probabilities": { "bathroom": 0.97, "...": 0.01 }, "confidence": 0.97 },
    "fall_risk": { "type": "score", "score": 1.6, "legend": { "0": "low", "1": "medium", "2": "high" }, "probabilities": {}, "confidence": 0.7 }
  },
  "usage": { "total_input_tokens": 1234, "total_output_tokens": 0, "total_tokens": 1234 }
}
```
- `noul` is P(yes), 0.01–0.99. `score` is a probability-weighted level index (can be fractional).

## Errors / limits
- Safety blocks and schema violations return HTTP 400 with an `error` object.
- Free tier: 200 RPM, 50,000 TPM, 10,000 RPD. Not supported: context caching, Batch, conversation history, tool calls.
