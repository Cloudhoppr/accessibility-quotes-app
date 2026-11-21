// Design tokens. Large type, high contrast, big tap targets (older users).
export const colors = {
  bg: "#F6F3EE", // warm off-white
  surface: "#FFFFFF",
  surfaceAlt: "#EFEAE2",
  ink: "#1D2B36", // primary text
  inkMuted: "#4F5E69", // secondary text (AA on bg)
  border: "#E2DBD0",
  primary: "#1F6F5C", // deep teal
  primaryPressed: "#175646",
  primarySoft: "#DCEDE7",
  onPrimary: "#FFFFFF",
  accent: "#C9822B", // warm amber
  accentSoft: "#F7E7D0",
  success: "#2E7D4F",
  successSoft: "#DFF0E5",
  danger: "#B3261E",
  dangerSoft: "#F9DEDC",
  overlay: "rgba(29,43,54,0.55)",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: "800" as const, color: colors.ink },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "700" as const, color: colors.ink },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const, color: colors.ink },
  body: { fontSize: 19, lineHeight: 27, fontWeight: "400" as const, color: colors.ink },
  bodyMuted: { fontSize: 18, lineHeight: 25, fontWeight: "400" as const, color: colors.inkMuted },
  label: { fontSize: 17, lineHeight: 22, fontWeight: "600" as const, color: colors.ink },
  small: { fontSize: 15, lineHeight: 20, fontWeight: "500" as const, color: colors.inkMuted },
  button: { fontSize: 20, lineHeight: 24, fontWeight: "700" as const },
};

export const MIN_TAP = 56;

export const shadow = {
  shadowColor: "#1D2B36",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
};
