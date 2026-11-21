// Stage 2: calm progress while Decision 1 runs. No back button.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, StyleSheet, View } from "react-native";
import { Text } from "../ui/Text";
import { runAnalysis, type AnalysisStage } from "../flow/runAnalysis";
import { useSession } from "../state/session";
import { Body, Gap, PrimaryButton, Screen, SecondaryButton, Title } from "../ui/components";
import { colors, space, type } from "../ui/theme";

const STEPS = ["Looking at your bathroom…", "Checking 7 common safety fixtures…", "Choosing what will help most…"] as const;

export default function AnalyzingScreen() {
  const { s, set, go } = useSession();
  const [stage, setStage] = useState<AnalysisStage>(0);
  const [notBathroom, setNotBathroom] = useState(false);
  const started = useRef(false);
  const sessionRef = useRef(s);
  sessionRef.current = s;

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runAnalysis(sessionRef.current, set, (n) => {
      setStage(n);
      AccessibilityInfo.announceForAccessibility(STEPS[n]);
    }).then((out) => {
      if (out.stale) return;
      if (!out.recorded && out.decision.value.isBathroomProb < 0.3) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        setNotBathroom(true);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      go("suggestions");
    });
  }, [set, go]);

  if (notBathroom) {
    return (
      <Screen
        stage={2}
        footer={
          <>
            <PrimaryButton label="Retake photos" icon="camera" onPress={() => go("photos")} />
            <SecondaryButton label="Continue anyway" onPress={() => go("suggestions")} />
          </>
        }
      >
        <View style={st.center}>
          <View style={[st.halo, { backgroundColor: colors.accentSoft }]}>
            <MaterialCommunityIcons name="image-search-outline" size={64} color={colors.accent} />
          </View>
          <Gap h={space.xl} />
          <Title style={{ textAlign: "center" }}>This doesn't look like a bathroom</Title>
          <Body muted style={{ textAlign: "center" }}>
            For the best suggestions, take clear photos of the toilet and the tub or shower.
          </Body>
        </View>
      </Screen>
    );
  }

  return (
    <Screen stage={2} scroll={false}>
      <View style={st.center}>
        <Pulse />
        <Gap h={space.xxl} />
        <Text style={[type.title, { textAlign: "center" }]} accessibilityRole="header" accessibilityLiveRegion="polite">
          {STEPS[stage]}
        </Text>
        <Gap h={space.sm} />
        <Body muted style={{ textAlign: "center" }}>
          This takes a few seconds.
        </Body>
        <Gap h={space.xxl} />
        <View style={st.list}>
          {STEPS.map((label, i) => {
            const done = i < stage;
            const active = i === stage;
            return (
              <View
                key={label}
                style={st.row}
                accessible
                accessibilityLabel={`${label.replace("…", "")}${done ? ", done" : active ? ", in progress" : ""}`}
              >
                <View style={st.rowIcon}>
                  {done ? (
                    <MaterialCommunityIcons name="check-circle" size={28} color={colors.success} />
                  ) : active ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <MaterialCommunityIcons name="circle-outline" size={28} color={colors.border} />
                  )}
                </View>
                <Text style={[type.body, { flex: 1 }, !done && !active && { color: colors.inkMuted }]}>
                  {label.replace("…", "")}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

/** Gently breathing icon with a soft expanding ring. */
function Pulse() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const ringScale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  return (
    <View style={st.pulseWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[st.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
      <Animated.View style={[st.halo, { transform: [{ scale }] }]}>
        <MaterialCommunityIcons name="shield-home-outline" size={64} color={colors.primary} />
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: space.xl },
  pulseWrap: { width: 160, height: 160, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 132, height: 132, borderRadius: 66, backgroundColor: colors.primarySoft },
  halo: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { alignSelf: "stretch", gap: space.md },
  row: { flexDirection: "row", alignItems: "center", minHeight: 40 },
  rowIcon: { width: 40, alignItems: "flex-start", justifyContent: "center" },
});
