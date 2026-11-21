// Stage 2: cost estimate.
// While the live Gemini 4 + Google Search lookup runs, every number is a skeleton.
// When it finishes: live prices if the search succeeded, otherwise the saved prices, quietly.
// Failures are never surfaced in the UI. Design: Paper file "SafeStep – Blue & Plex".
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../ui/Text";
import type { LivePrices, Result } from "../contracts";
import { ENABLE_LIVE_PRICES } from "../config";
import { fetchLivePrices } from "../ai/prices";
import { sleep } from "../ai/withFallback";
import { SAVED_PRICES } from "../data/prices";
import { SAMPLE_LIVE_PRICES } from "../data/sample";
import { shouldUseRecorded } from "../flow/runAnalysis";
import { buildEstimate } from "../logic/estimate";
import { useSession } from "../state/session";
import { PrimaryButton, Screen, SecondaryButton } from "../ui/components";
import { colors, radius, space, type } from "../ui/theme";
import SourcesSheet from "./SourcesSheet";

// Survives remounts (App remounts screens on every step change).
let pricesFor: unknown = null;

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const SKELETON_WIDTHS = [104, 92, 80, 98, 86];

export default function EstimateScreen() {
  const { s, set, go, reset } = useSession();
  const [sheet, setSheet] = useState(false);
  const sessionRef = useRef(s);
  sessionRef.current = s;

  const recorded = shouldUseRecorded(s);
  const canFetch = recorded ? !!SAMPLE_LIVE_PRICES : ENABLE_LIVE_PRICES;
  // Loading until the lookup for this analysis run has resolved (live or fallback).
  const loading = canFetch && s.livePrices == null;

  const live: LivePrices | null = s.livePrices?.source === "live" ? s.livePrices.value : null;
  const estimate = useMemo(() => buildEstimate(s.selected, SAVED_PRICES, live), [s.selected, live]);
  const isLive = estimate.priceSource === "live";

  // Start the lookup once per analysis run.
  useEffect(() => {
    const cur = sessionRef.current;
    if (cur.livePrices || !canFetch) return;
    const token = cur.decision;
    if (pricesFor === token) return; // already in flight for this run; its result lands in the session
    pricesFor = token;
    // Ask for every suggested fixture so toggling boxes later stays covered.
    const ids = cur.suggestions.length ? cur.suggestions.map((x) => x.fixtureId) : cur.selected;
    (async () => {
      let r: Result<LivePrices | null>;
      if (!ids.length) r = { source: "fallback", value: null, ms: 0 };
      else if (recorded) {
        await sleep(3000);
        r = { source: "live", value: SAMPLE_LIVE_PRICES, ms: 3000 };
      } else r = await fetchLivePrices(ids); // never throws; fallback on any failure
      set((prev) => (prev.decision !== token ? {} : { livePrices: r }));
    })().catch(() => set((prev) => (prev.decision !== token ? {} : { livePrices: { source: "fallback", value: null, ms: 0 } })));
  }, [set, canFetch, recorded]);

  // Reveal numbers with a soft fade when loading finishes.
  const reveal = useRef(new Animated.Value(loading ? 0 : 1)).current;
  const wasLoading = useRef(loading);
  useEffect(() => {
    if (wasLoading.current && !loading) {
      if (isLive) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      AccessibilityInfo.announceForAccessibility?.(`Estimated total ${money(estimate.totalLow)} to ${money(estimate.totalHigh)}.`);
      reveal.setValue(0);
      Animated.timing(reveal, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    wasLoading.current = loading;
  }, [loading, isLive, reveal, estimate.totalLow, estimate.totalHigh]);

  const contractor = estimate.contractor.replace(/\s*\(sample\)\s*$/i, "");

  return (
    <Screen
      stage={2}
      onBack={() => go("suggestions")}
      footer={
        <>
          <PrimaryButton label="Done" onPress={() => reset(true)} />
          <SecondaryButton label="Back to suggestions" onPress={() => go("suggestions")} />
        </>
      }
    >
      <Text style={type.title} accessibilityRole="header">
        Your cost estimate
      </Text>
      <Text style={[type.bodyMuted, { marginTop: 6 }]}>Installed prices for Chelsea, Manhattan.</Text>

      {/* Total */}
      <View
        style={st.totalCard}
        accessible
        accessibilityLabel={
          loading
            ? "Estimated total. Checking current prices in Manhattan."
            : `Estimated total ${money(estimate.totalLow)} to ${money(estimate.totalHigh)}, before tax.`
        }
      >
        <Text style={st.totalLabel}>Estimated total</Text>
        {loading ? (
          <>
            <View style={st.skelTotalRow}>
              <Skeleton width={118} height={36} radius={10} color="rgba(255,255,255,0.75)" />
              <View style={st.skelDash} />
              <Skeleton width={118} height={36} radius={10} color="rgba(255,255,255,0.75)" />
            </View>
            <View style={st.status}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={st.statusText}>Checking current prices in Manhattan…</Text>
            </View>
          </>
        ) : (
          <Animated.View style={{ opacity: reveal, gap: 12 }}>
            <Text style={st.totalValue} adjustsFontSizeToFit numberOfLines={1}>
              {money(estimate.totalLow)} – {money(estimate.totalHigh)}
            </Text>
            <Text style={type.small}>Before tax</Text>
            {isLive && (
              <View style={st.liveBadge}>
                <Text style={st.liveBadgeText}>From Gemini 4 + Google Search</Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>

      {/* Lines */}
      <View style={{ marginTop: 28 }}>
        {estimate.lines.map((l, i) => {
          const unit = SAVED_PRICES.items[l.fixtureId]?.unit ?? "each";
          return (
            <View
              key={l.fixtureId}
              style={st.line}
              accessible
              accessibilityLabel={loading ? `${l.name}, ${l.qty} ${unit}, price loading.` : `${l.name}, ${l.qty} ${unit}, ${money(l.low)} to ${money(l.high)}.`}
            >
              <View style={{ flex: 1 }}>
                <Text style={st.lineName}>{l.name}</Text>
                <Text style={type.small}>
                  {l.qty} {unit}
                </Text>
              </View>
              {loading ? (
                <Skeleton width={SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]} height={20} radius={6} />
              ) : (
                <Animated.View style={{ opacity: reveal, flexShrink: 0 }}>
                  <Text style={st.linePrice}>
                    {money(l.low)} – {money(l.high)}
                  </Text>
                </Animated.View>
              )}
            </View>
          );
        })}
        <Pressable
          onPress={() => setSheet(true)}
          accessibilityRole="button"
          accessibilityLabel="Where do these prices come from?"
          hitSlop={8}
          style={({ pressed }) => [st.link, pressed && { opacity: 0.6 }]}
        >
          <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
          <Text style={st.linkText}>Where do these prices come from?</Text>
        </Pressable>
      </View>

      {/* Contractor */}
      <View style={st.contractor} accessible accessibilityLabel={`Sample contractor: ${contractor}.`}>
        <View style={st.contractorIcon}>
          <MaterialCommunityIcons name="wrench-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.small}>Sample contractor</Text>
          <Text style={[type.label, { fontWeight: "500" }]}>{contractor}</Text>
        </View>
      </View>

      <SourcesSheet visible={sheet} onClose={() => setSheet(false)} estimate={estimate} />
    </Screen>
  );
}

/** A soft placeholder block that gently pulses while loading. */
function Skeleton({ width, height, radius: r, color = colors.skeleton }: { width: number; height: number; radius: number; color?: string }) {
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={{ width, height, borderRadius: r, backgroundColor: color, opacity: pulse, flexShrink: 0 }} />;
}

const st = StyleSheet.create({
  totalCard: {
    marginTop: space.xl,
    marginHorizontal: -4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    paddingTop: 22,
    paddingBottom: 20,
    paddingHorizontal: 22,
    gap: 14,
  },
  totalLabel: { fontSize: 17, lineHeight: 22, fontWeight: "500", color: colors.ink },
  totalValue: { fontSize: 40, lineHeight: 46, fontWeight: "600", color: colors.ink, letterSpacing: -0.8 },
  skelTotalRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  skelDash: { width: 14, height: 3, borderRadius: 2, backgroundColor: "#B9CCDE" },
  status: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.inkMuted },
  liveBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveBadgeText: { fontSize: 14, lineHeight: 18, fontWeight: "600", color: colors.primary },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 72,
  },
  lineName: { fontSize: 18, lineHeight: 24, fontWeight: "500", color: colors.ink },
  linePrice: { fontSize: 18, lineHeight: 24, fontWeight: "500", color: colors.ink, fontVariant: ["tabular-nums"] },
  link: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingTop: space.lg, minHeight: 44 },
  linkText: { fontSize: 17, lineHeight: 22, fontWeight: "500", color: colors.primary, textDecorationLine: "underline" },
  contractor: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: space.xl },
  contractorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
