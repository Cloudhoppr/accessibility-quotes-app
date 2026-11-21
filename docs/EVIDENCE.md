# How we checked SafeStep

This page lists the evidence that SafeStep works beyond the demo: the checks the app runs on its own AI output, the numbers we measured, the tests we ran, and where it fails. Everything here was measured on 2026-11-21. Where we have not measured something, we say so.

## Slide version

**Proof it works**
- **The app checks the AI's prices before showing them.** Live Gemini 4 prices must fall within 0.33x–3x of a saved, hand-checked range. During development the check rejected Gemini's numbers for 3 of 7 fixtures (for example $40–$1,000 for a shower seat), and those fixtures stayed on the checked prices.
- **The app has a rule-based fallback behind every AI decision.** If Gemini Decision 1 fails or takes longer than 15 s, plain rules pick the fixtures instead. The debug panel shows which one produced each result.
- **Measured speeds:** Decision 1 takes about 1 s, the Nano Banana photo edit 9–15 s and the Gemini 4 price search 14–24 s.
- **Where it fails:** it misread a lever faucet in a low-quality photo, it moved the camera angle in grab-bar previews, and live prices vary by about ±30% between runs.

## 1. Checks the app runs on its own output

| Check | What it compares against | What happens on failure | Where |
|---|---|---|---|
| Live price range check | A saved installed range per fixture (parts + labor). The live low and high must both fall between 0.33x the saved low and 3x the saved high. | That line keeps the saved price. If no line passes, the whole estimate stays on saved prices and the badge says "Saved prices". | `src/ai/prices.ts` |
| Price sanity bands during research | A per-fixture band for installed cost (for example, a grab bar should cost roughly $100–$400 installed). | The research script does not write that fixture; it keeps the hand-checked numbers. | `scripts/fetch-prices.mjs` |
| Rule-based fallback for fixture choice | Plain rules: a toilet in the scan or limited mobility leads to a toilet grab bar; a tub or shower leads to a grab bar and a seat; a non-slip mat is always included; lever handles only if gripping is a worry. | Used whenever Decision 1 errors, times out (15 s) or has no photos to look at. | `src/logic/rules.ts`, `src/ai/decision.ts` |
| "Is this a bathroom?" check | Decision 1's own yes/no answer on the photos. | Below 30% the app asks the user to retake the photos or continue anyway. | `src/screens/AnalyzingScreen.tsx` |
| Fixture applies to the room | The room scan. A toilet grab bar isn't suggested if the scan found no toilet. | The fixture is marked "not needed" without asking the model. | `src/fixtures.ts`, `src/ai/decision.ts` |
| No call can hang or crash the app | Every AI call has a time limit and returns either a live result or a fallback. It never throws. | The user always reaches the suggestions and the estimate, even offline. | `src/ai/withFallback.ts`, `src/ai/http.ts` |
| Call log | Every AI call records the model, HTTP status, time taken, bytes sent and any error. | Shown on the hidden debug panel (three-finger tap), so we can see live vs. fallback during the demo. | `src/ai/log.ts`, `src/screens/DebugScreen.tsx` |

## 2. Measured results (2026-11-21)

### Speed

| Call | Model | Measured |
|---|---|---|
| Choose fixtures from photos | `gemini-decision-1` | 0.66 s (text only), 1.0 s and 1.26 s (with photos) |
| Edit a photo to show a fixture | `gemini-nano-banana-2.1` | 8.9 s, 9.3 s, 12.5 s, 13.8 s, 14.7 s |
| Remove the scan overlay from a video frame | `gemini-nano-banana-2.1` | 8.8–10.3 s |
| Live price search with Google Search | `gemini-4-argon` (Interactions API) | 14.4 s, 16.1 s, 24.2 s |

### Choosing the Gemini 4 model for price search

We ran the same Google-Search-grounded price question on all four Gemini 4 variants at the same time, once each:

| Variant | Time | Result |
|---|---|---|
| `gemini-4-argon` | 20.0 s (16.0 s via the Interactions API) | Valid JSON |
| `gemini-4-hydrogen` | 31.0 s | Valid JSON |
| `gemini-4-neon` | 36.6 s | Valid JSON |
| `gemini-4-carbon` | 70.3 s | Valid JSON |

None of the four accepted the `minimal` thinking level (HTTP 400). We use argon.

### Price research outcome

- Gemini 4's ranges passed the sanity bands for 4 of 7 fixtures: tub/shower grab bars, handheld shower, non-slip set and lever faucet. Those numbers are in `src/data/prices.json`.
- They failed for 3 of 7 across 2–3 runs: $180–$650 for a toilet grab bar, $40–$1,000 for a shower seat and $98–$400 for a raised toilet seat. Those keep hand-checked estimates with retail and cost-guide sources. See `docs/pricing-notes.md`.
- On the first live run, the runtime check rejected $300–$900 for a shower seat. We then told Gemini that fixtures with no installation labor are mostly product cost, and all requested fixtures passed on the next run.

### Decision 1 on the sample bathroom

This is a real scan of an office shower room: a shower stall with a curtain, a sink with lever-style handles and a wooden bench, and no toilet. We ran one live call on two photos taken from the scan recording.

| Fixture | Model answer | Chance needed | Chance already installed | What we see in the photo |
|---|---|---|---|---|
| Shower seat | needed | 0.91 | 0.06 | No seat, so the answer looks right |
| Tub/shower grab bar | needed | 0.91 | 0.07 | No grab bar, so the answer looks right |
| Non-slip mat | needed | 0.87 | 0.09 | No mat or strips, so the answer looks right |
| Handheld shower | needed | 0.67 | 0.20 | Shower head not visible, so we can't tell |
| Lever handles | needed | 0.71 | 0.22 | Lever-style handles look present, so the answer looks **wrong** |
| Toilet grab bar, raised seat | not needed | — | — | No toilet in the scan, so correctly skipped |

"Is this a bathroom?" came back at 0.89.

## 3. Tests

| Test | What it covers | Result |
|---|---|---|
| `npx tsx scripts/test-parsers.ts` | Builds each API request and reads mock responses. Includes the range check, using a bad shower-seat range of $5–$9,000. | Passes. The bad range is rejected ("5-9000 outside 17-585"). |
| `npx tsx scripts/test-room.ts` | Reads RoomPlan scan files: a made-up room, a made-up multi-room structure, garbage input, `null`, an odd shape, and the real scan. | Passes. Garbage input gives an empty room instead of a crash. The real scan gives 9 walls, 1 door, a sink, a "table" and about 42 sq ft. |
| `npx tsx scripts/test-ai.ts` | Live calls to all three models with the real key. Prints status, time and response shape. | All three return HTTP 200 (times above). |
| `npx tsc --noEmit` and the CI build | Type check, then a full unsigned iOS build on GitHub's macOS runner on every push. | Passes. Release and Debug `.ipa` files are built in about 10–14 minutes. |
| Code review for crashes | A separate reviewer read the whole app looking for anything that would crash or strand the user in an iOS Release build. | Found one bug that stranded the user: the sample paths asked for a toilet photo the sample room doesn't have. Fixed before the demo build. No crash risks found. |

## 4. Where it fails

- **A soft photo misleads Decision 1.** It said the sample sink needs lever handles, but the photo seems to show lever-style handles. The photo is a frame from a 480×360 screen recording. We kept the model's real answer in the sample instead of correcting it.
- **Previews are illustrations, not placement plans.** Nano Banana moved the camera angle in all three grab-bar edits; we kept the closest one. It also tends to draw a plush rug when asked for a rubber-backed mat. The app labels every preview "AI illustration – not exact placement".
- **Live prices are not stable.** The high end of a range moved by about ±30% between runs. The range check stops extreme answers but not this variation.
- **Live price search is slow.** At 14–24 s it is too slow to block the screen, so the app shows saved prices first and updates them when the search returns.
- **The price search gives no citation links.** With a JSON-only answer, the Gemini 4 price search returned no citations. The app lists the Google searches Gemini ran as sources instead.
- **RoomPlan misses some things.** It has no "shower" category, so shower needs come from photos only. In our scan it labelled the bench as a "table".
- **Scanning needs LiDAR.** On iPhones without it (non-Pro models), Apple's scanner shows a camera with nothing happening. The user can cancel, then skip to photos or use the sample.
- **Prices are estimates.** Most sources give New York City or national ranges, not Chelsea-specific ones, and the contractor is fictional.

## 5. What we have not measured

- **Accuracy on a labelled set of bathrooms.** We have one real bathroom, not a test set, so we can't give an accuracy percentage for Decision 1 or compare it with the rule-based fallback.
- **Repeatability of Decision 1.** We haven't run the same photos many times to see how much the answers move.
- **Accessibility with real users.** The app uses large text, big buttons and VoiceOver labels, but no older adult or caretaker has tried it.
