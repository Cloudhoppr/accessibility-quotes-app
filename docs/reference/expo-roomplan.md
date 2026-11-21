# expo-roomplan — reference notes

From the npm registry README (fetched 2026-11-21). Latest version 1.3.2, published 2026-11-03.
Repo: https://github.com/fordat/expo-roomplan. Peer deps: expo, react, react-native (any version).

- Wraps Apple RoomPlan. Requires a LiDAR iPhone (user has iPhone 15 Pro, iOS 18). Needs a native build (expo-dev-client), not Expo Go.
- User's setup instructions: "Set up the Expo project with expo-roomplan and expo-dev-client, set the iOS deployment target to 17, and add a camera usage description."
- Output: a USDZ model plus RoomPlan's JSON (CapturedRoom: walls, doors, windows, objects such as toilet, bathtub, sink, with dimensions). **No photos.** Photos must be captured separately (for example expo-camera or expo-image-picker).

## Simplest API
```ts
import { useRoomPlan, ExportType } from "expo-roomplan";
const { startRoomPlan, roomScanStatus } = useRoomPlan({ exportType: ExportType.Parametric, sendFileLoc: true });
await startRoomPlan("My Scan"); // presents Apple's native scan UI, returns to previous screen when done
```
- `exportType`: parametric | mesh | model.
- `sendFileLoc: true` skips the iOS share sheet and returns the exported file URLs to JS.
- `roomScanStatus`: "Not Started" | "Canceled" | "Error" | "OK".

## Embeddable alternatives
- `<RoomPlanView scanName exportType sendFileLoc running finishTrigger addAnotherTrigger onStatus onPreview onExported />`
- `useRoomPlanView({ scanName, exportType, exportOnFinish, sendFileLoc, autoCloseOnTerminalStatus, onStatus, onPreview, onExported })` returns `{ viewProps, controls, state }`.
- `RoomPlanProvider` / `RoomPlanViewConsumer` for context-based control.
