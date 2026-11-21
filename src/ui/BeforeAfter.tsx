// Before/after photo card body for the AI preview. Animated-only, no extra deps.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import Shimmer from "./Shimmer";
import { colors, MIN_TAP, radius, space, type } from "./theme";

type View_ = "before" | "after";

export default function BeforeAfter({
  beforeUri,
  afterUri,
  state,
  fixtureLabel,
}: {
  beforeUri: string | null;
  afterUri: string | null;
  state: "loading" | "ready";
  fixtureLabel: string;
}) {
  const ready = state === "ready" && !!afterUri;
  const [view, setView] = useState<View_>(ready ? "after" : "before");
  const [afterLoaded, setAfterLoaded] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  // When the preview arrives, switch to "after" automatically.
  useEffect(() => {
    if (ready) setView("after");
    else {
      setView("before");
      setAfterLoaded(false);
    }
  }, [ready, afterUri]);

  const showAfter = ready && afterLoaded && view === "after";
  useEffect(() => {
    Animated.timing(fade, { toValue: showAfter ? 1 : 0, duration: 450, useNativeDriver: true }).start();
  }, [showAfter, fade]);

  const choose = (v: View_) => {
    if (!ready || v === view) return;
    Haptics.selectionAsync().catch(() => {});
    setView(v);
  };

  const label = !ready
    ? `Creating a preview of your bathroom with a ${fixtureLabel.toLowerCase()}.`
    : view === "after"
      ? `After: AI illustration of your bathroom with a ${fixtureLabel.toLowerCase()}. Double tap to see before.`
      : "Before: your bathroom photo. Double tap to see after.";

  return (
    <View>
      <View style={st.segment} accessibilityRole="tablist">
        {(["before", "after"] as const).map((v) => {
          const on = view === v;
          const disabled = !ready;
          return (
            <Pressable
              key={v}
              onPress={() => choose(v)}
              disabled={disabled}
              accessibilityRole="tab"
              accessibilityState={{ selected: on, disabled }}
              accessibilityLabel={v === "before" ? "Before" : "After"}
              style={[st.segBtn, on && st.segOn, disabled && v === "after" && { opacity: 0.5 }]}
            >
              <Text style={[type.label, { color: on ? colors.primary : colors.inkMuted }]}>
                {v === "before" ? "Before" : "After"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => choose(view === "after" ? "before" : "after")}
        disabled={!ready}
        accessible
        accessibilityRole={ready ? "button" : "image"}
        accessibilityLabel={label}
        style={st.frame}
      >
        {beforeUri ? (
          <Image source={{ uri: beforeUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceAlt }]} />
        )}

        {ready && (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
            <Image
              source={{ uri: afterUri! }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onLoad={() => setAfterLoaded(true)}
              onError={() => setAfterLoaded(false)}
            />
          </Animated.View>
        )}

        {!ready && (
          <>
            <Shimmer style={StyleSheet.absoluteFill} base="rgba(246,243,238,0.55)" />
            <View style={st.loadingChip}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[type.label, { marginLeft: space.sm, flexShrink: 1 }]}>Creating a preview of your bathroom…</Text>
            </View>
          </>
        )}

        {ready && (
          <View style={st.tag}>
            <Text style={[type.small, { color: colors.onPrimary, fontWeight: "700" }]}>
              {showAfter ? "After" : "Before"}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={st.caption}>
        <MaterialCommunityIcons name="creation" size={18} color={colors.inkMuted} />
        <Text style={[type.small, { marginLeft: 6, flexShrink: 1 }]}>
          AI illustration – not exact placement{ready ? " · Tap the photo to compare" : ""}
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: space.md,
  },
  segBtn: {
    flex: 1,
    minHeight: MIN_TAP - 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  segOn: {
    backgroundColor: colors.surface,
    shadowColor: "#1D2B36",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  frame: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
  loadingChip: {
    position: "absolute",
    left: space.md,
    right: space.md,
    bottom: space.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  tag: {
    position: "absolute",
    top: space.md,
    left: space.md,
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  caption: { flexDirection: "row", alignItems: "center", marginTop: space.sm },
});
