// Photo capture + normalisation: every photo becomes a ~1024px JPEG with base64 (M4).
// iPhone photos may be HEIC and rotated; manipulateAsync re-encodes and fixes orientation.
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat, type Action } from "expo-image-manipulator";
import type { Photo, PhotoSlot } from "../contracts";

export const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.7;

export type PickOutcome =
  | { kind: "ok"; photo: Photo }
  | { kind: "canceled" }
  | { kind: "denied" }
  | { kind: "error"; message: string };

/** Resize to ~1024px on the long edge, JPEG 0.7, base64 (no data: prefix). */
export async function normalizePhoto(
  uri: string,
  width: number,
  height: number,
  slot: PhotoSlot,
  source: Photo["source"]
): Promise<Photo> {
  const actions: Action[] = [];
  if (width > 0 && height > 0 && Math.max(width, height) > MAX_EDGE) {
    actions.push({ resize: width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE } });
  }
  let out = await manipulateAsync(uri, actions, { compress: JPEG_QUALITY, format: SaveFormat.JPEG, base64: true });
  // Unknown input size: check the output and shrink once more if needed.
  if (actions.length === 0 && Math.max(out.width, out.height) > MAX_EDGE) {
    const resize = out.width >= out.height ? { width: MAX_EDGE } : { height: MAX_EDGE };
    out = await manipulateAsync(out.uri, [{ resize }], { compress: JPEG_QUALITY, format: SaveFormat.JPEG, base64: true });
  }
  return { slot, uri: out.uri, base64: out.base64 ?? "", width: out.width, height: out.height, source };
}

/** Open the camera or the photo library and return a normalised Photo. Never throws. */
export async function pickPhoto(slot: PhotoSlot, from: "camera" | "library"): Promise<PickOutcome> {
  try {
    if (from === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { kind: "denied" };
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsEditing: false };
    const res = from === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.length) return { kind: "canceled" };
    const a = res.assets[0];
    const photo = await normalizePhoto(a.uri, a.width ?? 0, a.height ?? 0, slot, from);
    return { kind: "ok", photo };
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : String(e) };
  }
}
