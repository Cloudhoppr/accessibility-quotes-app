import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BUILD_SHA, HAS_KEY } from "../config";
import { SAMPLE_PHOTOS, SAMPLE_ROOM } from "../data/sample";
import { EMPTY_ROOM } from "../scan/summarizeRoom";
import { INITIAL_SESSION, useSession } from "../state/session";
import { IconBadge, Pill, PrimaryButton, SecondaryButton, type IconName } from "../ui/components";
import { colors, radius, shadow, space, type } from "../ui/theme";
import { useDebug } from "./DebugScreen";

const POINTS: { icon: IconName; title: string; text: string }[] = [
  { icon: "cellphone", title: "Scan the bathroom", text: "Walk around with your phone. About one minute." },
  { icon: "shield-check", title: "See what would help", text: "Simple suggestions like grab bars and a shower seat." },
  { icon: "cash", title: "Know the cost", text: "An estimate with local prices for Chelsea, Manhattan." },
];

export default function WelcomeScreen() {
  const { s, set } = useSession();
  const { open: openDebug } = useDebug();

  // No API key in this build: recorded results only.
  useEffect(() => {
    if (!HAS_KEY && !s.demoMode) set({ demoMode: true });
  }, [s.demoMode, set]);

  const toggleDemo = () => {
    if (!HAS_KEY) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    set({ demoMode: !s.demoMode });
  };

  const start = () =>
    set({
      step: "intake",
      // A fresh real run: drop any sample data left from an earlier pass.
      room: s.room.source === "sample" ? EMPTY_ROOM : s.room,
      photos: s.photos.filter((p) => p.source !== "sample"),
      decision: null,
      suggestions: [],
      selected: [],
      preview: INITIAL_SESSION.preview,
      livePrices: null,
    });

  const trySample = () =>
    set({
      step: "intake",
      demoMode: true,
      room: SAMPLE_ROOM,
      scanJsonUri: null,
      photos: SAMPLE_PHOTOS,
      decision: null,
      suggestions: [],
      selected: [],
      preview: INITIAL_SESSION.preview,
      livePrices: null,
    });

  return (
    <LinearGradient colors={[colors.primarySoft, colors.bg, colors.bg]} locations={[0, 0.45, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={st.topRow}>
          {s.demoMode ? <Pill label="Demo mode" tone="accent" icon="play-circle-outline" /> : <View />}
        </View>
        <ScrollView contentContainerStyle={st.body}>
          <Pressable
            onLongPress={toggleDemo}
            delayLongPress={700}
            accessibilityRole="image"
            accessibilityLabel="SafeStep logo"
            style={st.logo}
          >
            <MaterialCommunityIcons name="shield-home" size={56} color={colors.onPrimary} />
          </Pressable>

          <Pressable onLongPress={openDebug} delayLongPress={900} accessible={false}>
            <Text style={st.appName} accessibilityRole="header">
              SafeStep
            </Text>
          </Pressable>
          <Text style={st.tagline}>A safer bathroom, step by step.</Text>
          <Text style={[type.bodyMuted, { marginTop: space.md }]}>
            For older adults and the people who care for them.
          </Text>

          <View style={st.points}>
            {POINTS.map((p, i) => (
              <View key={p.title} style={[st.point, i > 0 && st.pointDivider]} accessible accessibilityLabel={`${p.title}. ${p.text}`}>
                <IconBadge name={p.icon} size={52} tone={i === 2 ? "accent" : "primary"} />
                <View style={{ flex: 1, marginLeft: space.lg }}>
                  <Text style={type.label}>{p.title}</Text>
                  <Text style={[type.small, { fontSize: 16, lineHeight: 22, marginTop: 2 }]}>{p.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={st.footer}>
          <PrimaryButton label="Get started" icon="arrow-right" onPress={start} />
          <SecondaryButton label="Try a sample bathroom" icon="home-heart" onPress={trySample} />
          <Pressable onLongPress={openDebug} delayLongPress={900} accessible={false}>
            <Text style={st.meta}>About 3 minutes · No account needed · v{BUILD_SHA}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  topRow: { height: 40, paddingHorizontal: space.xl, flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  body: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xl },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xl,
    ...shadow,
    shadowOpacity: 0.18,
  },
  appName: { fontSize: 44, lineHeight: 50, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 },
  tagline: { fontSize: 24, lineHeight: 31, fontWeight: "600", color: colors.primary, marginTop: space.xs },
  points: {
    marginTop: space.xxl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  point: { flexDirection: "row", alignItems: "center", paddingVertical: space.lg },
  pointDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.sm, gap: space.md },
  meta: { ...type.small, fontSize: 14, textAlign: "center", paddingVertical: space.xs },
});
