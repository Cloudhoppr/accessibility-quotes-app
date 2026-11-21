// Design tokens: "harbor fog at dawn". Pale calm blue, cool light ground, IBM Plex Serif.
// Source of truth: Paper file "SafeStep – Blue & Plex".
// Large type, high contrast, big tap targets (older users).
export const colors = {
  bg: "#F1F5F9", // morning fog
  surface: "#FFFFFF", // white sail
  surfaceAlt: "#E6EDF4",
  ink: "#1B2F44", // harbor ink: primary text
  inkMuted: "#55667A", // wet slate: secondary text
  border: "#DCE3EB",
  skeleton: "#DCE4ED",
  // Deep harbor blue: icons, links, selected outlines, progress, checkmarks.
  primary: "#2F5E8C",
  primaryPressed: "#24496D",
  primarySoft: "#DCEAF7", // pale sky: soft fills, pills, total card
  onPrimary: "#FFFFFF", // content on deep `primary` fills
  // Cornflower water: primary buttons (pale fill, dark ink label).
  button: "#A8CBEC",
  buttonPressed: "#93BCE3",
  onButton: "#1B2F44",
  // Lamplight: the single warm note.
  accent: "#8A5A1C",
  accentSoft: "#F3E3C6",
  // "Good" states use the blue family instead of green.
  success: "#2F5E8C",
  successSoft: "#DCEAF7",
  danger: "#B3261E",
  dangerSoft: "#F9DEDC",
  overlay: "rgba(27,47,68,0.55)",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

// fontWeight picks the IBM Plex Serif face via src/ui/Text.tsx.
export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: "600" as const, color: colors.ink, letterSpacing: -0.5 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: "600" as const, color: colors.ink, letterSpacing: -0.3 },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: "600" as const, color: colors.ink },
  body: { fontSize: 19, lineHeight: 27, fontWeight: "400" as const, color: colors.ink },
  bodyMuted: { fontSize: 17, lineHeight: 24, fontWeight: "400" as const, color: colors.inkMuted },
  label: { fontSize: 17, lineHeight: 22, fontWeight: "500" as const, color: colors.ink },
  small: { fontSize: 15, lineHeight: 20, fontWeight: "400" as const, color: colors.inkMuted },
  caps: { fontSize: 13, lineHeight: 16, fontWeight: "600" as const, color: colors.inkMuted, letterSpacing: 1, textTransform: "uppercase" as const },
  button: { fontSize: 20, lineHeight: 24, fontWeight: "600" as const },
};

export const MIN_TAP = 56;

export const shadow = {
  shadowColor: "#1B2F44",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
};
