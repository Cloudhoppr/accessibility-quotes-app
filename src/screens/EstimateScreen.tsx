// Stage 2: cost estimate. Saved prices show instantly; a live Gemini 4 + Google Search refresh swaps in when it lands.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import type { LivePrices, Result } from "../contracts";
import { ENABLE_LIVE_PRICES } from "../config";
import { fetchLivePrices } from "../ai/prices";
import { sleep } from "../ai/withFallback";
import { SAVED_PRICES } from "../data/prices";
import { SAMPLE_LIVE_PRICES } from "../data/sample";
import { FIXTURES } from "../fixtures";
import { shouldUseRecorded } from "../flow/runAnalysis";
import { buildEstimate } from "../logic/estimate";
import { useSession } from "../state/session";
import { Card, Gap, PrimaryButton, Screen, SecondaryButton, Title, type IconName } from "../ui/components";
import { colors, radius, space, type } from "../ui/theme";
import SourcesSheet, { friendlyDate } from "./SourcesSheet";

// Survives remounts (App remounts screens on every step change).
let pricesFor: unknown = null;

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export default function EstimateScreen() {
  const { s, set, go, reset } = useSession();
  const [fetching, setFetching] = useState(false);
  const [sheet, setSheet] = useState(false);
  const started = useRef(false);
  const sessionRef = useRef(s);
  sessionRef.current = s;

  const live: LivePrices | null = s.livePrices?.source === "live" ? s.livePrices.value : null;
  const estimate = useMemo(() => buildEstimate(s.selected, SAVED_PRICES, live), [s.selected, live]);
  const isLive = estimate.priceSource === "live";

  // Background live refresh, once per analysis run. Saved prices are already on screen.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const cur = sessionRef.current;
    if (cur.livePrices) return;
    const recorded = shouldUseRecorded(cur);
    if (recorded ? !SAMPLE_LIVE_PRICES : !ENABLE_LIVE_PRICES) return;
    const token = cur.decision;
    if (pricesFor === token) return; // already fetching/fetched for this analysis run
    pricesFor = token;
    // Ask for every suggested fixture so toggling boxes later stays covered.
    const ids = cur.suggestions.length ? cur.suggestions.map((x) => x.fixtureId) : cur.selected;
    if (!ids.length) return;
    setFetching(true);
    (async () => {
      let r: Result<LivePrices | null>;
      if (recorded) {
        await sleep(2500);
        r = { source: "live", value: SAMPLE_LIVE_PRICES, ms: 2500 };
      } else {
        r = await fetchLivePrices(ids);
      }
      set((prev) => (prev.decision !== token ? {} : { livePrices: r }));
      setFetching(false);
    })().catch(() => setFetching(false));
  }, [set]);

  // Celebrate the swap to live prices with a gentle pulse.
  const pulse = useRef(new Animated.Value(0)).current;
  const wasLive = useRef(isLive);
  useEffect(() => {
    if (isLive && !wasLive.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      pulse.setValue(0);
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
    wasLive.current = isLive;
  }, [isLive, pulse]);
  const totalScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  const contractor = estimate.contractor.replace(/\s*\(sample\)\s*$/i, "");
  const n = estimate.lines.length;

  return (
    <Screen
      stage={2}
      onBack={() => go("suggestions")}
      footer={
        <>
          <PrimaryButton label="Done" icon="check" onPress={() => reset(true)} />
          <SecondaryButton label="Back to suggestions" onPress={() => go("suggestions")} />
        </>
      }
    >
      <Title>Your cost estimate</Title>
      <Text style={type.bodyMuted}>
        {n} safety {n === 1 ? "fixture" : "fixtures"}, installed in Chelsea, Manhattan.
      </Text>
      <Gap h={space.lg} />
      <PriceBadge fetching={fetching && !isLive} live={isLive} gatheredOn={estimate.gatheredOn} />
      <Gap h={space.lg} />

      <Animated.View style={{ transform: [{ scale: totalScale }] }}>
        <View
          style={st.totalCard}
          accessible
          accessibilityLabel={`Estimated total ${money(estimate.totalLow)} to ${money(estimate.totalHigh)}, before tax.`}
        >
          <Text style={[type.label, { color: colors.onPrimary, opacity: 0.85 }]}>Estimated total</Text>
          <Gap h={space.xs} />
          <Text style={[type.display, { color: colors.onPrimary, fontSize: 38, lineHeight: 46 }]} adjustsFontSizeToFit numberOfLines={1}>
            <TweenMoney value={estimate.totalLow} /> – <TweenMoney value={estimate.totalHigh} />
          </Text>
          <Text style={[type.small, { color: colors.onPrimary, opacity: 0.85 }]}>Estimate before tax</Text>
        </View>
      </Animated.View>
      <Gap h={space.xl} />

      <Card>
        {estimate.lines.map((l, i) => {
          const f = FIXTURES[l.fixtureId];
          const unit = SAVED_PRICES.items[l.fixtureId]?.unit ?? "each";
          return (
            <View
              key={l.fixtureId}
              style={[st.line, i > 0 && st.divider]}
              accessible
              accessibilityLabel={`${l.name}, ${l.qty} ${unit}, ${money(l.low)} to ${money(l.high)}${l.live ? ", current price" : ""}.`}
            >
              <View style={st.lineIcon}>
                <MaterialCommunityIcons name={(f?.icon ?? "tools") as IconName} size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: space.md }}>
                <Text style={type.label}>{l.name}</Text>
                <Text style={type.small}>
                  {l.qty} × {unit} · parts and installation
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", marginLeft: space.sm }}>
                <Text style={[type.label, { fontVariant: ["tabular-nums"] }]}>
                  <TweenMoney value={l.low} />–<TweenMoney value={l.high} />
                </Text>
                {l.live && (
                  <View style={st.liveTag}>
                    <View style={st.liveDot} />
                    <Text style={[type.small, { fontSize: 13, color: colors.success, fontWeight: "700" }]}>live</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </Card>
      <Gap h={space.lg} />

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={[st.lineIcon, { backgroundColor: colors.accentSoft }]}>
            <MaterialCommunityIcons name="account-hard-hat" size={24} color={colors.accent} />
          </View>
          <View style={{ flex: 1, marginLeft: space.md }}>
            <Text style={type.small}>Sample contractor</Text>
            <Text style={type.label}>{contractor}</Text>
            <Text style={type.small}>{estimate.location}</Text>
          </View>
        </View>
        <View style={st.soon} accessible accessibilityLabel="Request a visit. Coming soon.">
          <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.inkMuted} />
          <Text style={[type.label, { color: colors.inkMuted, marginLeft: space.sm }]}>Request a visit · Coming soon</Text>
        </View>
      </Card>
      <Gap h={space.lg} />

      <Text style={[type.small, { textAlign: "center" }]}>Sample estimate for illustration. Not a real quote.</Text>
      <Gap h={space.md} />
      <Pressable
        onPress={() => setSheet(true)}
        accessibilityRole="button"
        accessibilityLabel="Where do these prices come from?"
        style={({ pressed }) => [st.link, pressed && { backgroundColor: colors.primarySoft }]}
      >
        <MaterialCommunityIcons name="information-outline" size={22} color={colors.primary} />
        <Text style={[type.label, { color: colors.primary, marginLeft: space.sm, textDecorationLine: "underline" }]}>
          Where do these prices come from?
        </Text>
      </Pressable>

      <SourcesSheet visible={sheet} onClose={() => setSheet(false)} estimate={estimate} />
    </Screen>
  );
}

function PriceBadge({ fetching, live, gatheredOn }: { fetching: boolean; live: boolean; gatheredOn: string }) {
  const fade = useRef(new Animated.Value(1)).current;
  const kind = fetching ? "fetching" : live ? "live" : "saved";
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [kind, fade]);

  const text =
    kind === "fetching"
      ? "Checking current NYC prices…"
      : kind === "live"
        ? "Live · Gemini 4 + Google Search"
        : `Saved prices · gathered ${friendlyDate(gatheredOn)}`;
  const bg = kind === "live" ? colors.primarySoft : colors.surfaceAlt;
  const fg = kind === "live" ? colors.primary : colors.inkMuted;

  return (
    <Animated.View
      style={[st.badge, { backgroundColor: bg, opacity: fade }]}
      accessible
      accessibilityLabel={text.replace("·", ",")}
      accessibilityLiveRegion="polite"
    >
      {kind === "fetching" ? (
        <ActivityIndicator size="small" color={colors.inkMuted} />
      ) : (
        <MaterialCommunityIcons name={kind === "live" ? "web-check" : "content-save-outline"} size={18} color={fg} />
      )}
      <Text style={[type.small, { color: fg, fontWeight: "700", marginLeft: 6 }]}>{text}</Text>
    </Animated.View>
  );
}

/** Money text that counts smoothly to a new value when it changes. */
function TweenMoney({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const anim = useRef(new Animated.Value(value)).current;
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setShown(v));
    Animated.timing(anim, { toValue: value, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [value, anim]);
  return <>{money(shown)}</>;
}

const st = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  totalCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: space.xl,
    shadowColor: "#1D2B36",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  line: { flexDirection: "row", alignItems: "center", paddingVertical: space.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: space.sm, paddingTop: space.md },
  lineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  liveTag: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, marginRight: 4 },
  soon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.lg,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: radius.md,
  },
});
