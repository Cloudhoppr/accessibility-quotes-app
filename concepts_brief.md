# SafeStep: Bathroom Accessibility Suggestions and Estimates (working name)

* **Author:** Trivi Sunil
* **Date:** 2026-11-21

## Overview

An iPhone app for older adults and the people who care for them. The user scans a bathroom with the iPhone's LiDAR sensor, takes two or three guided photos, and answers two or three tap-only questions. The app then tells them which safety fixtures from a short fixed list would help, where to put them, what one would look like in their own bathroom, and roughly what installing them would cost in Chelsea, Manhattan.

The app is built for a 4-hour Gemini hackathon and judged as a live demo on an iPhone 15 Pro (iOS 18). The goal is a clean, friendly, working demo. Engineering rigor is not a goal, and hardcoding is welcome.

**Stack:** React Native with Expo and `expo-dev-client`. `expo-roomplan` 1.3.2 handles scanning. Gemini Decision 1 picks fixtures, a Gemini 4 model writes the explanations, and Nano Banana 2.1 edits a photo to show the fixture installed. The phone calls the Gemini APIs directly with plain `fetch` and the API key built into the app; there is no backend. A GitHub Actions macOS runner builds an unsigned `.ipa`, which is sideloaded with Sideloadly using a free Apple ID.

Reference notes: [docs/reference/gemini-decisions-api.md](docs/reference/gemini-decisions-api.md), [docs/reference/expo-roomplan.md](docs/reference/expo-roomplan.md), [docs/reference/gemini-image-and-search.md](docs/reference/gemini-image-and-search.md).

## Analysis

All seven review lenses completed. They agreed on one diagnosis. The project misses the deadline if the build loop runs too many times, or if a native dependency or `expo-roomplan` itself breaks late. The demo fails if it depends on a laptop running Metro on stage, or on three AI calls in a row over venue Wi-Fi with no fallback. The fix is to freeze the native app shell in the first 30–40 minutes. After that, make the main path local and predictable: a fixture catalog, written templates, price JSON and a bundled sample bathroom. Every Gemini call then adds to that main path and falls back quietly if it fails.

Items marked *[unverified]* came from reviewers' memory, not from the reference notes. Check them before relying on them.

### Blockers

**B1. The CI rebuild loop can use up the 4 hours.** One macOS build (prebuild, CocoaPods, xcodebuild, zip) takes about 15–25 minutes, plus download and sideload. That leaves time for about 6–10 device tries in the whole event. On a private repo, macOS minutes count 10x against the free allowance *[unverified]*.
- Install every native module the app could need in the first commit. After that, `package.json`, the lockfile and `app.json` change only through the orchestrator. The set:
  - `expo-dev-client`
  - `expo-roomplan@1.3.2`
  - `expo-image-picker`
  - `expo-image-manipulator`
  - `expo-file-system`
  - `expo-build-properties` (iOS deployment target 17.0)
  - optional: `expo-linear-gradient`, `expo-haptics`, `react-native-svg`
- If an agent asks for a new native dependency later, the answer is to use pure JS instead.
- The first build is a smoke test with three things on screen:
  - a button that runs `startRoomPlan` and prints whatever it returns;
  - a button that takes a photo, resizes it and prints its size;
  - a label showing whether the API key is present.
- Sideload that build and launch it by about T+0:40.
- If `expo-roomplan` fails to compile or crashes, try `newArchEnabled: false` once *[unverified]*. If it still fails at T+1:30, drop scanning and go photo-only.
- Add fast-fail steps before xcodebuild: `npx tsc --noEmit` and `npx expo export --platform ios`. Both fail in about a minute instead of 20. Agents run both on Windows before handing work back.
- Workflow settings:
  - `concurrency` with `cancel-in-progress: true`
  - build only on pushes to `main` (only the orchestrator pushes) plus a manual trigger
  - ignore changes under `docs/**`
  - 45-minute timeout
  - artifacts kept for 1 day

**B2. A Debug dev-client build cannot be the demo build.** A Debug dev client has no JavaScript inside it. It loads JS from Metro on the laptop. At the venue, Wi-Fi isolation or a laptop going to sleep shows a red error screen to the judges. The plan uses two lanes:
- **Dev lane (optional speed-up):**
  - One Debug dev-client `.ipa` with a separate bundle ID ending in `.dev`, sideloaded once.
  - Change JS through `npx expo start` on Windows, with the laptop on the phone's hotspot. Windows Firewall may need port 8081 allowed. Use `--tunnel` only if the hotspot connection fails.
  - If Metro hasn't connected within about 10 minutes, abandon this lane and do Release builds every ~30 minutes instead.
- **Demo lane (mandatory):**
  - A Release build with the JS bundle inside it.
  - First known-good build by about T+2:15, tagged `good-1`, with its `.ipa` saved on the desktop.
  - Feature freeze at T+3:00; final build installed by T+3:30.
  - Never install over a known-good build unless its `.ipa` is at hand.
- The separate `.dev` bundle ID uses one of the three app slots a free Apple ID allows. It keeps a dev install from replacing the demo app. Leave Sideloadly's "change bundle ID" option off.

**B3. Live AI calls have no fallback.** The chain is Decision, then Gemini 4 text, then Nano Banana, plus photo uploads over venue Wi-Fi. Any step can time out, hit a safety or schema error (HTTP 400), hit a quota or permissions error (403 or 429), or lose its key. Every call goes through one helper that never throws: `withFallback(fn, timeoutMs, canned)`, using an `AbortController`. It returns `{ source: 'live' | 'fallback', value }`. Use the phone's cellular data, not venue Wi-Fi.

| Step | Timeout | Fallback |
| --- | --- | --- |
| Scan cancelled or errors | – | "Skip scan / use sample scan", then continue with photos only |
| Camera denied or no photo | – | Photo library, or the bundled sample photos |
| Decision 1 | ~12 s | Rule table (see below), or recorded scores for the sample bathroom |
| Gemini 4 text | ~20 s | Pre-written text per fixture from the catalog |
| Nano Banana edit | ~40 s, does not block | Pre-made "after" image for the sample bathroom; otherwise hide the card |
| Estimate | – | Local JSON, cannot fail |

The rule table:
- A toilet in the scan, or low mobility, gives a toilet grab bar and a raised toilet seat.
- A bathtub gives a tub grab bar, a shower seat and a handheld shower head.
- A non-slip mat is always included.
- Lever handles appear only if the user reports grip trouble.

Other demo safeguards:
- **Hidden Demo Mode** (long-press the logo): forces the sample bathroom and recorded results, with staged delays of about 1.5 s per step so it still looks live.
- **Missing key:** if the key is empty at runtime, show a "Demo mode" pill and switch to recorded results.
- **Recorded results:** save real successful responses during development and bundle them, so fallback output looks real.
- **Rehearsal:** practice once in airplane mode.

**B4. A live scan of the venue bathroom will probably undercut the pitch.** Commercial restrooms already meet ADA rules, with grab bars and lever handles in place. An honest Decision 1 call would answer "nothing needed". Stalls, mirrors and dim light also make LiDAR less accurate, judges can't crowd into a restroom, and a scan takes 30–120 seconds on stage.
- Add a **"Try a sample bathroom"** button on the home screen. It bundles a slimmed scan JSON from a real home bathroom, 2–3 photos, and recorded Decision, text and image results.
- Pitch flow: a short live scan proves capture works, then switch to the sample home ("imagine this is your mom's bathroom") for the suggestions and estimate.
- When the app detects a fixture that's already installed, show it as "Already in place" with a check mark. A scan of the venue then shows detection working instead of showing an empty result.

**B5. Prove the API key, model access and Sideloadly before writing feature code.** Finding a 403 or a missing image-model tier at hour 3 ends the demo. Sideloadly's first-run setup can't be fixed quickly at the venue.
- A `scripts/preflight.mjs` script runs on Windows with plain `fetch`. It makes one real call to each of:
  - Decision 1, with a bathroom JPEG;
  - Gemini 4, with JSON output;
  - Gemini 4, with Google Search grounding;
  - Nano Banana 2.1, with an edit.

  It records each status, latency and response shape, and saves the raw responses as mock data. It also picks the fastest Gemini 4 variant and confirms Nano Banana works on this key's billing tier (image models may have no free tier *[unverified]*).
- How the key reaches the app:
  - It lives in the GitHub secret `GEMINI_API_KEY`, exposed at job level as `EXPO_PUBLIC_GEMINI_API_KEY`.
  - Job level matters because Expo copies `EXPO_PUBLIC_*` values into the JS bundle while xcodebuild bundles the JS. If the variable isn't set for that step, the app ships with an empty key *[unverified, high confidence]*.
  - Never commit the key. `.env` is gitignored.
  - The key ends up inside the `.ipa`. Use a dedicated key with a budget cap and rotate it after judging.
- Sideloadly checklist:
  - iTunes and iCloud installed from Apple's website, not the Microsoft Store *[unverified]*.
  - Apple ID signed in, with the device that receives 2FA codes at hand.
  - Developer Mode on the iPhone (requires a reboot).
  - The signing profile trusted under Settings > General > VPN & Device Management.
  - A USB-C cable.
- If the hackathon forbids setup before the clock starts, all of this lands in the first 30 minutes and every milestone moves about 30 minutes later.

**B6. Undefined shared contracts will make parallel agents diverge.** Five parts of the code must agree on what a fixture is: Decision question keys, generated text, image prompts, price rows and UI cards. An agent that invents a fixture with no price row breaks the estimate. Before any parallel work starts, the orchestrator writes and freezes three files:
- **`src/fixtures.ts`** — exactly 7 IDs:
  - `toilet_grab_bar`
  - `tub_shower_grab_bar`
  - `shower_seat`
  - `raised_toilet_seat`
  - `handheld_shower`
  - `nonslip_mat`
  - `lever_handles`

  Each entry has: label, icon, a one-line description, a precondition (for example, needs a tub), the photo slot it uses, the Decision question text, the Nano Banana edit prompt, fallback text (title, why it helps, placement) and a price key. Placement text can use ADA numbers, for example a toilet grab bar 33–36 in. above the floor and 42 in. long (ADA 2010 §604.5) *[unverified, high confidence]*.
- **`src/contracts.ts`** — the shared types: `IntakeAnswers`, `RoomSummary`, `Photo`, `DecisionScores`, `Suggestion {fixtureId, title, why, placement}`, `PreviewState`, `PriceLine`, `PriceSource`, `Estimate`, `Result<T>`, `Session`.
- **`src/config.ts`** — model IDs, the key, the `DEMO_MODE` and `ENABLE_PREVIEW` flags, and timeouts. No model ID strings anywhere else.

Scope notes for agents:
- "Non-slip" means a bath mat or adhesive strips, not new flooring.
- "Lever handles" means faucet levers.
- "Shower seat" means a seat, not a transfer bench.

### Major issues

**M1. One model chooses fixtures.** In the original hypothesis, Decision 1 scores fixtures and Gemini 4 also "writes 2–3 suggestions". With two models choosing, fixture IDs won't match.

> **Author decision (2026-11-21), replaces the proposal below:**
> - Decision 1 is the only fixture selector.
> - The per-fixture "why / where" text comes from catalog templates. There is no Gemini 4 text call at runtime.
> - Gemini 4 runs the Google-Search-grounded price search **live** on the estimate screen. The saved `prices.json` shows immediately. A background Gemini 4 call (Interactions API, `tools: [{type:"google_search"}]`, about 20 s timeout) asks for Manhattan installed-cost ranges for the selected fixtures as JSON.
> - The app accepts a live range only if it parses and falls within 0.33x–3x of the saved range. It then swaps it in with a "Live · Gemini 4 + Google Search" badge and adds the cited URLs to the sources sheet.
> - On any failure, the saved prices stay and the badge reads "Saved prices · gathered 2026-11-21".
> - The same query, run once during development, produces `prices.json`.
>
> The probability-to-label mapping and "prices only from the catalog/search, never invented" rules below still apply. The Gemini 4 explanation-JSON parts do not.

- Decision 1 is the only selector. A plain function, `selectFixtures(scores, answers)`, picks the top 3 scoring 0.5 or higher and always returns at least one. Mobility answers can add small boosts, for example +0.1 to the shower seat for a cane, walker or wheelchair user.
- Gemini 4 gets only the chosen IDs, the photos, the room summary and the answers. It returns JSON `[{fixtureId, title, why, placement}]`, requested with `responseMimeType: "application/json"` and a response schema (schema support on Gemini 4 is *[unverified]*).
- The app drops unknown IDs and fills any gaps from templates.
- Prices always come from the catalog, never from model output.
- Gemini 4 text stays on the runtime path, because this is a Gemini 4 hackathon. Its call starts as soon as Decision returns, in parallel with Nano Banana.
- Show plain labels, never percentages:
  - 0.8 or higher: "Strongly recommended"
  - 0.6 to 0.8: "Recommended"
  - below 0.6: "Worth considering"

  Probability bars appear only on the debug screen.

**M2. How to word the Decision 1 questions.**
- Use one `choice` question per fixture with three options: `already_installed`, `needed`, `not_needed`. This gives both the recommendation and the "Already in place" check mark in one question.
- Don't use double negatives like the reference example's "Is there no grab bar…?". Each question's text must stand on its own, because the model never sees the question keys.
- Add an `is_bathroom` yes/no question. If its probability is below 0.3, ask the user to retake the photos.
- Input formatting:
  - Start with a text block holding the intake answers and the room summary.
  - Put a text label before each photo naming its slot ("Photo: toilet area").
  - End every text block with a newline, because adjacent blocks are joined with no separator.

**M3. Use plain REST `fetch`, not the `@google/genai` SDK.** Under React Native's Hermes engine, the SDK risks missing Node features (Buffer, streams, TextDecoder) and package-export errors. The Decisions API also needs SDK version 3.2 or later. Plain `fetch` is about 30 lines.
- One `src/ai/http.ts` provides `postJson(url, body, {timeoutMs})`. It sets the `x-goog-api-key` header, normalizes errors and logs each call to an in-memory list.
- Files in `src/ai/*` import nothing from React Native or Expo, so they can be tested on Windows with `npx tsx scripts/test-*.ts`.
- Endpoints:
  - Decision 1: `POST v1beta/decisions`.
  - Text and image: `generateContent`. Leave the Interactions API out.
- REST request details *[unverified]*:
  - Body: `contents:[{role:"user", parts:[{text},{inline_data:{mime_type,data}}]}]`.
  - Image output: `generationConfig.responseModalities: ["TEXT","IMAGE"]` and `imageConfig.imageSize: "1K"`.
  - Low latency: `thinkingConfig.thinkingLevel: "minimal"`.
  - Response parsing: read `part.inlineData ?? part.inline_data` and skip parts marked `thought`.
  - If `/v1` rejects the newer image fields, retry on `/v1beta`.

**M4. Photos: guided slots, resized to JPEG.**
- Replace "take 1–3 photos" with named slots:
  - "Toilet area" (required).
  - "Shower or tub" (required if the scan found a tub).
  - "Anything else" (optional).
- Each fixture maps to a slot, so Nano Banana edits the right photo. Tell users to keep people out of the frame; this lowers the chance of a safety refusal.
- Capture with `expo-image-picker` `launchCameraAsync`.
- Run each photo through `expo-image-manipulator`: about 1024 px on the long edge, JPEG at quality 0.7, with base64 output. iPhone photos may be HEIC, and Decision 1 rejects a `mime_type` that doesn't match the real format. This step also fixes rotation. Expect about 150–300 KB per photo.
- Send the same base64 to every call.
- Store the Nano Banana output as a cache file and keep only its path in memory.
- Check the installed version's API: the newer `ImageManipulator.manipulate()...renderAsync()` call may replace `manipulateAsync` *[unverified]*.

**M5. The RoomPlan output format is unknown, and the raw JSON is too large to send.**
- The README doesn't say whether `startRoomPlan` resolves with file URLs or delivers them through an event. It also doesn't confirm that a JSON file is exported next to the USDZ.
- The smoke build (B1) prints the real return value, and an agent reads the installed package's TypeScript and Swift source in `node_modules`.
- A tolerant function, `summarizeRoom()`, cuts the JSON down to about 200 characters, for example `{objects:[{category,w,d,h}], hasTub, hasToilet, doorCount, approxFloorM2}`. Category values may look like `{"toilet":{}}`; take the first key.
- Facts from memory:
  - RoomPlan has no shower category *[unverified, high confidence]*, so shower fixtures are judged from photos only.
  - The toilet's height includes the tank, so don't use it to decide on a raised seat.
- Commit one real scan as sample data.
- If no JSON is available by T+1:30, the scan becomes a visual step only and the photos carry the evidence.
- Don't build a 3D model viewer; Apple's scanning screen is the 3D moment.

**M6. Nano Banana must not block anything, must be easy to cut, and must be labelled.**
- Edit one image, for the top fixture only.
- Turn it on and off with the `ENABLE_PREVIEW` flag. Each card is in one of four states: idle, loading, ready, failed.
- While loading, show a shimmer placeholder. The image fades in when ready; on failure, the slot hides.
- Label the image "AI illustration – not exact placement". Tapping toggles between before and after.
- Start the edit as soon as Decision returns, in parallel with the Gemini 4 text call.
- Go/no-go at T+2:15. Keep it if the preflight median latency is under ~25 s and the hackathon rules allow non-Gemini-4 models.
- Pre-make "after" images for the sample bathroom in hour 1 either way, so Demo Mode keeps the before-and-after moment.

**M7. Pricing: research Chelsea prices once and drop the location multiplier.** Prices gathered for Manhattan need no multiplier. Adding one creates a pitch question you can't back up.
- **How prices are gathered:** at T+0, a data agent runs one Gemini 4 query per fixture with Google Search grounding, asking for the installed cost (parts plus labor) in Manhattan. It opens each cited link, records the final URL and title (grounding links may be expiring redirects *[unverified]*), and checks the numbers by eye.
- **What `src/data/prices.json` holds, per fixture:**
  - display name
  - parts low/high and labor low/high
  - unit and default quantity
  - `sources[] {title, url}`

  The file also holds one `gathered_on` date and the contractor name. A hand-written stub with the same shape comes first, so the estimate screen is never blocked.
- **Estimate screen:**
  - A range per item and a total range, marked "before tax", with the date gathered.
  - An obviously fictional contractor ("Sample contractor: Chelsea Home Safety Co.") and the note "Sample estimate for illustration. Not a real quote."
  - A **"Where do these prices come from?"** sheet listing the sources, which answers the judges' question inside the app.
- **Wording:** say "estimate" in the UI, not "quote".
- **Selection screen:** checkboxes, all selected at first, with the total updating as boxes change.
- **Pitch answers:**
  - Base prices: "Gemini 4 searched the web for Manhattan installation costs once during development; the sources are listed in the app."
  - Multiplier: "None; we priced Manhattan directly."
  - Be honest that most sources give NYC or national ranges, not Chelsea-specific ones.

**M8. File ownership so parallel agents don't collide.**
- **Phase 0 (orchestrator alone, ~30–40 min):**
  - Scaffold the app.
  - Install all dependencies; write `app.json`, the CI workflow and `.gitattributes`.
  - Write the frozen files: config, contracts, fixtures, the HTTP helper, the session store and mocks.
  - Write `App.tsx` with stub screens, so the app runs from start to finish.
- **Phase 1 (in parallel, separate files; only the orchestrator commits and pushes):**

  | Agent | Owns |
  | --- | --- |
  | AI | `src/ai/{decision,suggest,render,withFallback}.ts`, `src/scan/summarizeRoom.ts`, `scripts/test-*.ts` (tested against the live API on Windows) |
  | Logic | `src/logic/{select,estimate}.ts` (plain functions) |
  | UI kit (first) | `src/ui/theme.ts`, `src/ui/components.tsx`: screen shell with step indicator, primary button, card, choice chip, loading state, error banner with "Use sample" |
  | Screens | `src/screens/{Welcome,Intake,Scan,Photos,Analyzing,Suggestions,Estimate}Screen.tsx`, built against mocks only |
  | Data | `scripts/fetch-prices.mjs`, `src/data/prices.json`, `assets/demo/**` (sample photos and "after" images) |

- **Phase 2:** the orchestrator wires the screens together in `App.tsx`.
- **Rules:**
  - No agent runs `npm install` or `expo install` after phase 0.
  - Navigation is a single `step` value plus one shared context, not expo-router.

**M9. No way to see errors in a Release build without a Mac.** A JS crash in a Release build just closes the app.
- Add a top-level error boundary and a global error handler that shows fatal errors on screen.
- Add a hidden debug screen (long-press) showing:
  - the last ~20 AI calls: model, status, latency, payload size and the start of any error;
  - the build's git SHA, from `EXPO_PUBLIC_BUILD_SHA` set in CI;
  - whether the key is present (yes or no, never the value);
  - the raw RoomPlan return value.

**M10. Readability for older users and caretakers.**
- Body text 18–20 pt or larger, headings 28 pt or larger, following the phone's text-size setting.
- Strong contrast (WCAG AA) and tap targets of 48–56 pt.
- One main button per screen, labelled with a verb ("Start room scan", "See my suggestions").
- A step indicator and a Back button.
- No jargon: never "LiDAR", "USDZ" or "probability".
- VoiceOver labels on every button.
- Intake is tap-only chips with defaults, and each answer must change something:
  - Who it's for: Myself / A parent or relative / Someone I care for. This changes the wording only.
  - How they get around: Walks without help / Cane or walker / Wheelchair.
  - Optional, what worries you most: Sitting down or standing up / Getting in or out of the tub / Slipping.
- Before the scan, a screen explains that a helper can do this step and should walk slowly, pointing the phone at the walls and floor.
- If the scan is cancelled: "Scan didn't finish. Try again, or skip and use photos only."
- During analysis, show staged progress messages ("Looking at your bathroom…", "Checking 7 common safety fixtures…", "Writing suggestions…").

**M11. CI recipe (consensus).**
```
runs-on: macos-15            # select the Xcode the Expo SDK needs [unverified versions]
env: EXPO_PUBLIC_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}   # job level
steps: checkout -> setup-node 20 (npm cache) -> npm ci -> tsc --noEmit -> expo export (fast fail)
CI=1 npx expo prebuild -p ios --clean          # also runs pod install
xcodebuild -workspace ios/<App>.xcworkspace -scheme <App> \
  -configuration $CONFIG -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" -quiet
mkdir -p Payload && cp -R build/Build/Products/$CONFIG-iphoneos/<App>.app Payload/
zip -qry <App>-$CONFIG-$SHA.ipa Payload        # -y keeps framework symlinks
upload-artifact@v4 (retention-days: 1)
```
- No `exportArchive`, because it requires signing.
- App name and scheme contain no spaces.
- `ios.bundleIdentifier` is set; otherwise prebuild stops to ask for one.
- Both `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` are set. A missing description crashes the app.
- `.gitattributes` contains `* text=auto eol=lf`.
- Never commit `ios/`.
- Skip CocoaPods caching unless the first build takes more than 20 minutes.
- Add no push, iCloud or App Group capabilities, because a free Apple ID can't sign them.

### Minor points
- Pick the fastest Gemini 4 variant (carbon, argon, neon or hydrogen) for runtime calls, based on preflight timings. Use the strongest one for the one-time price research.
- Leave the 3D model viewer out.
- A sideloaded app with a free Apple ID expires after 7 days, so do the final install on demo day.
- Demo script (2–3 minutes):
  1. The problem, with one real fall statistic (don't make one up).
  2. A 30-second scan.
  3. Two photos.
  4. Two taps for the questions.
  5. Staged progress.
  6. Suggestion cards with "why".
  7. Before-and-after image.
  8. Estimate, then "Where do these prices come from?"

  Rehearse three times: live, in Demo Mode, and in airplane mode.
- Prepare a short "shortcuts we took" answer for judges: the key is built into the app (production would put a server in between), the contractor is hardcoded, and the estimate is a sample.

### Contradictions and how the design removes them

| Contradiction | Change | Result |
| --- | --- | --- |
| Fast changes vs. a native iOS build with no Mac | Build the native shell once with every dependency; afterwards change only JS and data | CI runs a handful of times, not on every change |
| The scan takes time but adds nothing visible | Use the scan's sizes for placement text and quantities (floor area gives the mat size, tub length gives the bar count) | Estimate lines visibly come from the user's own room (stretch) |
| Need explanations, but Decision 1 can't write text | Pre-written text per fixture; Decision 1 only selects; Gemini 4 rewrites the text for this room when it's available | Usable result after one network call |
| Live demo vs. a venue room that needs nothing | "Already in place" check marks, plus the sample-home path | Every outcome tells a useful story |
| Unverifiable hardcoded prices | One-time cited research shown in an in-app sources sheet; no multiplier | Every number traces back in one tap |
| Photo-real preview vs. made-up placement and slow responses | Label it as an illustration and let it load after everything else. Stretch: a top-down floor plan drawn from the scan JSON with pins for fixtures (~45 min) | The image is extra and never the evidence |

**Ideal end state:** a native shell frozen early, with all logic in JS and data, and a main path that never needs the network: catalog, templates, scan summary and cited prices. Decision 1 selects the fixtures. Gemini 4 text and Nano Banana add to the result when the network works. The sample home is cached, so the demo finishes whatever the room or network is like.

## Goals vs. Non-Goals

* **In-Scope Goals:**
  - A Release `.ipa` with the JS bundled inside, built by GitHub Actions and sideloaded onto an iPhone 15 Pro.
  - Flow: Welcome → 2–3 tap-only questions → bathroom scan (skippable) → 2–3 guided photos → staged analysis → suggestion cards → estimate with sources.
  - Gemini Decision 1 chooses among a fixed list of 7 fixtures and detects which are already installed.
  - Catalog templates provide the "why" and "where" text. Gemini 4 refreshes the price ranges live with Google Search on the estimate screen, with saved prices as the fallback.
  - Nano Banana 2.1 shows a before-and-after image for the top fixture. It is cuttable, and pre-made images back it up.
  - Chelsea/Manhattan price ranges researched once with cited sources, with a hardcoded sample contractor.
  - A "Try a sample bathroom" path and a hidden Demo Mode that work with no network.
  - Large text, high contrast, large tap targets and VoiceOver labels.
* **Out-of-Scope Non-Goals:**
  - Shopify Shop MCP, product search and purchasing.
  - Editing or rendering 3D models (no USDZ viewer).
  - Rooms other than bathrooms.
  - Real contractor lookup, live quotes, booking or contacting contractors.
  - A backend or proxy, user accounts, saved history.
  - Android, App Store or TestFlight distribution, code signing beyond Sideloadly.
  - Tests beyond the `tsx` scripts for the AI calls, a production-grade architecture, keeping the API key secret.
  - Fixtures outside the fixed list of 7, and renovation work like flooring or walk-in showers.

## Alternatives Weighed

- **Shopify Shop MCP for product search and purchase.** Rejected by author: it needs a backend relay or an MCP client inside React Native, it's unclear whether accessibility fixtures are well covered, and it's a side feature that could take an hour.
- **Editing the 3D scan to show fixtures.** Rejected by author: changing a USDZ model and rendering it in React Native is not feasible in 4 hours. Photo editing with an image model replaces it.
- **Gemini 4 for image editing.** Not possible. The Gemini 4 models output text only. Nano Banana 2.1 is the image-editing model.
- **Live contractor quotes from a local-business API.** Rejected by author: no free API exists, and a believable estimate with a hardcoded contractor is enough for the demo.
- **Price tables plus a location multiplier.** Rejected during review: prices gathered directly for Manhattan need no multiplier, and a multiplier adds an unsupported pitch claim.
- **Live search-grounded price lookup at runtime.** Rejected by author in favor of one search during development cached as JSON. That avoids a live failure point and the cost of repeated calls.
- **A backend proxy for the API key.** Rejected by author: calling Gemini from the phone with the key in the app removes a whole service from a 4-hour build. The key is restricted, capped and rotated after judging.
- **The `@google/genai` SDK in the app.** Rejected during review: there's a risk of missing Node features under Hermes, and plain `fetch` is about 30 lines.
- **Letting both Decision 1 and Gemini 4 pick fixtures.** Rejected during review: fixture IDs wouldn't match, and it adds a second network wait. Decision 1 is the only selector.
- **Cutting Decision 1 and using one Gemini 4 JSON call.** Simplest, but rejected during review. It removes the Decisions API showcase, and the six other lenses kept it.
- **A Debug dev-client build for the demo.** Rejected during review: it needs Metro running on the laptop on stage.
- **Scanning the venue restroom as the main demo.** Rejected during review: commercial restrooms already have the fixtures, it raises privacy and logistics problems, and it's slow. A bundled sample home is the main path; a live scan only proves capture works.
- **expo-router and expo-camera.** Rejected during review in favor of a single step state and `expo-image-picker`, which means fewer native pieces and less setup.

## Key Decisions & Staging for Next Steps

**Decisions carried forward:**
1. Native dependencies freeze in the first commit. The smoke build proves RoomPlan, the camera and the key before any feature work.
2. Two lanes: an optional Debug dev client (`.dev` bundle ID) using Metro over the phone's hotspot, and a mandatory Release build for the demo.
3. Decision 1 is the only fixture selector. It asks one `choice` question per fixture (`already_installed` / `needed` / `not_needed`) plus `is_bathroom`. The intake questions come before analysis, so their answers go into the Decision input.
4. Templates explain the chosen fixtures. Gemini 4 refreshes prices live with Google Search, with saved prices as the fallback. Nano Banana edits one photo, doesn't block anything, and is go/no-go at T+2:15.
5. All AI calls use plain `fetch` through `withFallback`. Bundled sample data and Demo Mode keep the main path offline-safe.
6. Prices are researched once with citations and stored in `prices.json`, with no multiplier. The UI says "estimate" and includes a sources sheet.
7. The fixture catalog, contracts and config are frozen before parallel agents start. Only the orchestrator pushes.

**Timeline:**
- **Before the clock (if allowed):** key and preflight script, Sideloadly first-run checklist, GitHub repo and secret, 2–3 well-lit photos of a real home bathroom.
- **T+0:00–0:30:** Orchestrator scaffolds the app, installs dependencies, pushes the smoke build (Release and `.dev` Debug), and writes the frozen files and mocks while CI runs.
- **T+0:30–1:00:** Parallel agents work: AI, logic, UI kit then screens, and data (prices, sample assets, "after" images).
- **T+1:00 go/no-go:** the `.ipa` installs and launches, RoomPlan's output shape is captured, and the AI scripts pass. If RoomPlan still fails at T+1:30, go photo-only.
- **T+1:00–2:15:** Integration; the room summary is fitted to the real scan output.
- **T+2:15:** First Release build `good-1`, and the Nano Banana go/no-go.
- **T+2:15–3:00:** Fallbacks, sources sheet, polish, airplane-mode test.
- **T+3:00:** Feature freeze and final Release build.
- **T+3:30–3:50:** Sideload, smoke test, rehearse. Roll back to `good-1` if needed.
- **T+3:50–4:00:** Buffer, no pushes.

**Cut ladder (cut from the top first):**
1. The live Nano Banana call (keep the pre-made images).
2. The Metro dev lane.
3. The third photo and third question.
4. RoomPlan JSON as AI input (the scan stays as a visual step).
5. The live Gemini 4 price refresh (use saved prices).
6. RoomPlan entirely (photo-only).

**Never cut:** a Release build, the sample bathroom and Demo Mode, Decision 1 on photos, and the offline estimate with sources.

**Stretch, only if time remains:** quantities and placement text from the scan's sizes, a top-down floor-plan view with fixture pins, a Decision 1 check that the edited image actually shows the fixture.

**Author answers (2026-11-21):**
- The clock has already started, so the "before the clock" checklist moves into the first 30 minutes.
- Non-Gemini-4 models (Nano Banana) and pre-made images are allowed.
- **Public repo.**
  - Upside: standard GitHub-hosted macOS runners are free for public repos, so the minute limit in B1 no longer applies.
  - Downside: anyone signed in to GitHub can download the `.ipa` artifact and pull the API key out of the JS bundle. Mitigations: restrict the key to the Generative Language API, set a budget cap, keep artifacts for 1 day, and rotate the key after judging.
- **Network:** the phone's hotspot is the main network for the dev lane and for live AI calls; venue Wi-Fi is the fallback. The Metro dev lane (B2) becomes the main way to iterate. The demo still uses a Release build.
- **Sample bathroom (B4):** the author has a **RoomPlan export** (USDZ + JSON) of a real bathroom.
  - Its JSON becomes the sample's room data and the first test input for `summarizeRoom()`, before any live scan.
  - Photos may only be low-quality screenshots from a screen recording of the RoomPlan session. Plan for that:
    - Crop out the iOS and RoomPlan interface.
    - Run one Nano Banana call during development to remove RoomPlan's white outline overlay, keeping the room unchanged. The cleaned images become the sample's "before" photos, and the "after" images and recorded Decision results are made from them.
    - The sample is labelled "Sample bathroom" in the app.
    - If the screenshots are too poor even after cleanup, use a licence-free photo of a residential bathroom for the photo evidence and keep the real scan JSON for room data.
- **Gemini 4 role:** live grounded price search with a saved fallback (see M1). There is no runtime text call; explanations come from templates.

**Process:** skip `/egm-draft`, because the clock is running. Build directly from this brief, starting with phase 0 (scaffold, frozen dependencies, CI, smoke build).

**Check before relying on:**
- What `expo-roomplan`'s `startRoomPlan` returns when `sendFileLoc` is set, and whether a JSON file is exported.
- Which Xcode version the Expo SDK needs on `macos-15`.
- Nano Banana's REST path (v1 vs v1beta) and its thinking-level field.
- Whether Gemini 4 supports a JSON response schema, and which variant is fastest.
- Whether image models work on this key's billing tier.
- Sideloadly and free Apple ID limits.
- Whether grounding citations are redirect URLs.
- The ADA mounting heights.
- The installed `expo-file-system` and `expo-image-manipulator` APIs.
