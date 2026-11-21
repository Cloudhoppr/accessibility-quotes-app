// App-wide Text: renders IBM Plex Serif, picking the face from fontWeight/fontStyle.
// Custom fonts on iOS need one family name per face, so we map weight -> family here
// instead of relying on fontWeight (which would fake bold on a single face).
import { IBMPlexSerif_400Regular } from "@expo-google-fonts/ibm-plex-serif/400Regular";
import { IBMPlexSerif_400Regular_Italic } from "@expo-google-fonts/ibm-plex-serif/400Regular_Italic";
import { IBMPlexSerif_500Medium } from "@expo-google-fonts/ibm-plex-serif/500Medium";
import { IBMPlexSerif_600SemiBold } from "@expo-google-fonts/ibm-plex-serif/600SemiBold";
import { IBMPlexSerif_700Bold } from "@expo-google-fonts/ibm-plex-serif/700Bold";
import type { ComponentProps } from "react";
import { Text as RNText, StyleSheet, type TextStyle } from "react-native";

type Props = ComponentProps<typeof RNText>;

/** Pass to expo-font's useFonts() once at app start. */
export const PLEX_FONTS = {
  "PlexSerif-Regular": IBMPlexSerif_400Regular,
  "PlexSerif-Italic": IBMPlexSerif_400Regular_Italic,
  "PlexSerif-Medium": IBMPlexSerif_500Medium,
  "PlexSerif-SemiBold": IBMPlexSerif_600SemiBold,
  "PlexSerif-Bold": IBMPlexSerif_700Bold,
};

function weightOf(w: TextStyle["fontWeight"]): number {
  if (w === undefined || w === "normal") return 400;
  if (w === "bold") return 700;
  const n = typeof w === "number" ? w : parseInt(String(w), 10);
  return Number.isFinite(n) ? n : 400;
}

export function plexFamily(weight: TextStyle["fontWeight"], italic = false): string {
  const w = weightOf(weight);
  if (italic && w < 500) return "PlexSerif-Italic";
  if (w >= 700) return "PlexSerif-Bold";
  if (w >= 600) return "PlexSerif-SemiBold";
  if (w >= 500) return "PlexSerif-Medium";
  return "PlexSerif-Regular";
}

// React 19: `ref` arrives as a normal prop and is passed through in {...props}.
export function Text(props: Props) {
  const flat = (StyleSheet.flatten(props.style) ?? {}) as TextStyle;
  // Leave explicitly chosen non-Plex fonts alone (e.g. Menlo on the debug screen).
  if (flat.fontFamily && !flat.fontFamily.startsWith("PlexSerif")) {
    return <RNText {...props} />;
  }
  const fontFamily = plexFamily(flat.fontWeight, flat.fontStyle === "italic");
  return <RNText {...props} style={[flat, { fontFamily, fontWeight: "normal", fontStyle: "normal" }]} />;
}
