// Shared UI kit. Screens should build from these, not raw styles.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, MIN_TAP, radius, shadow, space, type } from "./theme";

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const STAGES = ["About you", "Your bathroom", "Suggestions"] as const;

/** Full-screen shell: optional back button, 3-stage progress, scrollable body, sticky footer. */
export function Screen(props: {
  stage?: 0 | 1 | 2; // which of STAGES is active; omit to hide progress
  onBack?: () => void;
  footer?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  onTitleLongPress?: () => void;
}) {
  const { stage, onBack, footer, children, scroll = true } = props;
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      {(onBack || stage !== undefined) && (
        <View style={s.topBar}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={12}
              style={({ pressed }) => [s.back, pressed && { opacity: 0.6 }]}
            >
              <MaterialCommunityIcons name="chevron-left" size={30} color={colors.primary} />
              <Text style={[type.label, { color: colors.primary }]}>Back</Text>
            </Pressable>
          ) : (
            <View style={{ width: 80 }} />
          )}
          {stage !== undefined && <Progress stage={stage} />}
          <View style={{ width: 80 }} />
        </View>
      )}
      <Body
        style={{ flex: 1 }}
        contentContainerStyle={scroll ? { paddingHorizontal: 28, paddingTop: space.lg, paddingBottom: space.xxl } : undefined}
        {...(!scroll ? { style: { flex: 1, paddingHorizontal: 28, paddingVertical: space.lg } } : {})}
      >
        {children}
      </Body>
      {footer && <View style={s.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

function Progress({ stage }: { stage: number }) {
  return (
    <View style={s.progress} accessibilityLabel={`Step ${stage + 1} of 3: ${STAGES[stage]}`}>
      {STAGES.map((_, i) => (
        <View key={i} style={[s.dot, i < stage && { backgroundColor: colors.button }, i === stage && { width: 28, backgroundColor: colors.primary }]} />
      ))}
    </View>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: any }) {
  return (
    <Text style={[type.title, { marginBottom: space.sm }, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: any }) {
  return <Text style={[muted ? type.bodyMuted : type.body, style]}>{children}</Text>;
}

export function PrimaryButton(props: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { label, onPress, icon, disabled, loading } = props;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        s.primary,
        pressed && { backgroundColor: colors.buttonPressed, transform: [{ scale: 0.99 }] },
        (disabled || loading) && { opacity: 0.45 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onButton} />
      ) : (
        <>
          <Text style={[type.button, { color: colors.onButton }]}>{label}</Text>
          {icon && <MaterialCommunityIcons name={icon} size={24} color={colors.onButton} style={{ marginLeft: space.sm }} />}
        </>
      )}
    </Pressable>
  );
}

export function SecondaryButton(props: { label: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      style={({ pressed }) => [s.secondary, pressed && { backgroundColor: colors.primarySoft }]}
    >
      {props.icon && <MaterialCommunityIcons name={props.icon} size={22} color={colors.primary} style={{ marginRight: space.sm }} />}
      <Text style={[type.button, { color: colors.primary, fontSize: 18, fontWeight: "500" }]}>{props.label}</Text>
    </Pressable>
  );
}

export function Card({ children, style, onPress, selected, accessibilityLabel }: {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  selected?: boolean;
  accessibilityLabel?: string;
}) {
  const inner = [s.card, selected && { borderColor: colors.primary, borderWidth: 2.5 }, style];
  if (!onPress) return <View style={inner}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [...inner, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

/** Large tap-only choice chip (single or multi select handled by caller). */
export function ChoiceChip(props: { label: string; selected: boolean; onPress: () => void; icon?: IconName; sublabel?: string }) {
  const { label, selected, onPress, icon, sublabel } = props;
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [s.chip, selected && s.chipOn, pressed && { opacity: 0.8 }]}
    >
      {icon && <MaterialCommunityIcons name={icon} size={28} color={selected ? colors.primary : colors.inkMuted} style={{ marginRight: space.md }} />}
      <View style={{ flex: 1 }}>
        <Text style={[type.label, { fontSize: 19 }, selected && { color: colors.primary }]}>{label}</Text>
        {sublabel && <Text style={type.small}>{sublabel}</Text>}
      </View>
      <MaterialCommunityIcons
        name={selected ? "check-circle" : "checkbox-blank-circle-outline"}
        size={28}
        color={selected ? colors.primary : colors.border}
      />
    </Pressable>
  );
}

export function Pill({ label, tone = "neutral", icon }: { label: string; tone?: "neutral" | "success" | "accent" | "primary" | "danger"; icon?: IconName }) {
  const map = {
    neutral: [colors.surfaceAlt, colors.inkMuted],
    success: [colors.successSoft, colors.success],
    accent: [colors.accentSoft, colors.accent],
    primary: [colors.primarySoft, colors.primary],
    danger: [colors.dangerSoft, colors.danger],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      {icon && <MaterialCommunityIcons name={icon} size={16} color={fg} style={{ marginRight: 4 }} />}
      <Text style={[type.small, { color: fg, fontWeight: "700" }]}>{label}</Text>
    </View>
  );
}

export function IconBadge({ name, size = 56, tone = "primary" }: { name: IconName; size?: number; tone?: "primary" | "accent" | "success" }) {
  const bg = tone === "primary" ? colors.primarySoft : tone === "accent" ? colors.accentSoft : colors.successSoft;
  const fg = tone === "primary" ? colors.primary : tone === "accent" ? colors.accent : colors.success;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <MaterialCommunityIcons name={name} size={size * 0.52} color={fg} />
    </View>
  );
}

export function Banner({ text, tone = "accent", actionLabel, onAction }: { text: string; tone?: "accent" | "danger" | "primary"; actionLabel?: string; onAction?: () => void }) {
  const bg = tone === "danger" ? colors.dangerSoft : tone === "primary" ? colors.primarySoft : colors.accentSoft;
  return (
    <View style={[s.banner, { backgroundColor: bg }]}>
      <Text style={[type.body, { flex: 1, fontSize: 17 }]}>{text}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={10}>
          <Text style={[type.label, { color: colors.primary, textDecorationLine: "underline" }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export const Gap = ({ h = space.lg }: { h?: number }) => <View style={{ height: h }} />;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.md, height: 52 },
  back: { flexDirection: "row", alignItems: "center", minHeight: 44, width: 80 },
  progress: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  footer: { paddingHorizontal: 28, paddingTop: space.md, paddingBottom: space.md, gap: space.md, backgroundColor: colors.bg },
  primary: {
    minHeight: 62,
    borderRadius: radius.md,
    backgroundColor: colors.button,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: space.xl,
  },
  secondary: {
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.button,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: space.xl,
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: colors.border, ...shadow },
  chip: {
    minHeight: MIN_TAP + 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginBottom: space.md,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pill: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  banner: { flexDirection: "row", alignItems: "center", gap: space.md, borderRadius: radius.md, padding: space.lg },
});
