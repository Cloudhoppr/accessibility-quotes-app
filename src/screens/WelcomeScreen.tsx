import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../ui/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { HAS_KEY } from "../config";
import { SAMPLE_PHOTOS, SAMPLE_ROOM } from "../data/sample";
import { EMPTY_ROOM } from "../scan/summarizeRoom";
import { INITIAL_SESSION, useSession } from "../state/session";
import { Pill, PrimaryButton, SecondaryButton, type IconName } from "../ui/components";
import { colors, space } from "../ui/theme";
import { useDebug } from "./DebugScreen";

const POINTS: { icon: IconName; title: string; text: string }[] = [
  { icon: "cellphone", title: "Scan the bathroom", text: "Walk around with your phone. About one minute." },
  { icon: "shield-check-outline", title: "See what would help", text: "Simple suggestions like grab bars and a shower seat." },
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
    <SafeAreaView style={st.root} edges={["top", "bottom"]}>
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
          <MaterialCommunityIcons name="home-outline" size={38} color={colors.primary} />
        </Pressable>

        <Pressable onLongPress={openDebug} delayLongPress={900} accessible={false}>
          <Text style={st.appName} accessibilityRole="header">
            SafeStep
          </Text>
        </Pressable>
        <Text style={st.tagline}>A safer bathroom, step by step.</Text>

        <View style={st.points}>
          {POINTS.map((p) => (
            <View key={p.title} style={st.point} accessible accessibilityLabel={`${p.title}. ${p.text}`}>
              <View style={st.pointIcon}>
                <MaterialCommunityIcons name={p.icon} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.pointTitle}>{p.title}</Text>
                <Text style={st.pointText}>{p.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={st.footer}>
        <PrimaryButton label="Get started" icon="arrow-right" onPress={start} />
        <SecondaryButton label="Try a sample bathroom" icon="home-outline" onPress={trySample} />
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topRow: { height: 40, paddingHorizontal: 28, flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  body: { paddingHorizontal: 28, paddingTop: space.lg, paddingBottom: space.xl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  appName: { fontSize: 44, lineHeight: 50, fontWeight: "600", color: colors.ink, letterSpacing: -0.9 },
  tagline: { fontSize: 22, lineHeight: 30, fontWeight: "400", color: colors.inkMuted, marginTop: 10 },
  points: { marginTop: 36, gap: 22 },
  point: { flexDirection: "row", alignItems: "flex-start", gap: space.lg },
  pointIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pointTitle: { fontSize: 19, lineHeight: 26, fontWeight: "600", color: colors.ink },
  pointText: { fontSize: 17, lineHeight: 24, fontWeight: "400", color: colors.inkMuted, marginTop: 2 },
  footer: { paddingHorizontal: 28, paddingTop: space.md, paddingBottom: space.lg, gap: space.md },
});
