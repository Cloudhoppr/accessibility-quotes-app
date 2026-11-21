// "Where do these prices come from?" page sheet. Lists the research method and every cited source.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Estimate, PriceSource } from "../contracts";
import { SAVED_PRICES } from "../data/prices";
import { useSession } from "../state/session";
import { Gap } from "../ui/components";
import { colors, MIN_TAP, radius, space, type } from "../ui/theme";

/** "2026-11-21" -> "Nov 21, 2026" (no timezone shift). */
const EVIDENCE_URL = "https://github.com/Cloudhoppr/accessibility-quotes-app/blob/main/docs/EVIDENCE.md";

const CHECKS = [
  "Live prices from Gemini 4 are only used if they fall within a reasonable range of our checked prices. Otherwise we keep the checked price.",
  "In testing, this check threw out Gemini's numbers for 3 of 7 fixtures, so those use hand-checked prices.",
  "If the AI is slow or offline, simple safety rules choose the fixtures instead, so you always get an answer.",
];

export function friendlyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function hostOf(url: string): string {
  const m = /^https?:\/\/([^/?#]+)/i.exec(url);
  return m ? m[1].replace(/^www\./, "") : url;
}

function dedupe(list: PriceSource[], seen: Set<string>): PriceSource[] {
  const out: PriceSource[] = [];
  for (const src of list) {
    if (!src?.url || seen.has(src.url)) continue;
    seen.add(src.url);
    out.push(src);
  }
  return out;
}

export default function SourcesSheet({
  visible,
  onClose,
  estimate,
}: {
  visible: boolean;
  onClose: () => void;
  estimate: Estimate;
}) {
  const { s } = useSession();
  const seen = new Set<string>();
  const liveSources =
    estimate.priceSource === "live" && s.livePrices?.source === "live" && s.livePrices.value
      ? dedupe(s.livePrices.value.sources ?? [], seen)
      : [];
  const groups = estimate.lines
    .map((l) => ({ name: l.name, sources: dedupe(SAVED_PRICES.items[l.fixtureId]?.sources ?? [], seen) }))
    .filter((g) => g.sources.length > 0);
  const extra = dedupe(estimate.sources ?? [], seen);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={st.root}>
        <View style={st.header}>
          <Text style={[type.heading, { flex: 1 }]} accessibilityRole="header">
            Where do these prices come from?
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            style={({ pressed }) => [st.close, pressed && { opacity: 0.6 }]}
          >
            <Text style={[type.label, { color: colors.primary }]}>Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxl * 2 }}>
          <View style={st.method}>
            <MaterialCommunityIcons name="magnify" size={24} color={colors.primary} />
            <Text style={[type.body, { flex: 1, marginLeft: space.sm }]}>{SAVED_PRICES.method}</Text>
          </View>
          <Gap h={space.md} />
          <Text style={type.small}>
            Prices are for {SAVED_PRICES.location}, gathered {friendlyDate(SAVED_PRICES.gatheredOn)}. Each range includes parts and
            installation. Sources often give New York City or national ranges rather than Chelsea-only prices.
          </Text>

          <View style={st.checks}>
            <Text style={type.label} accessibilityRole="header">
              How we check these numbers
            </Text>
            <Gap h={space.sm} />
            {CHECKS.map((c) => (
              <View key={c} style={{ flexDirection: "row", marginBottom: space.sm }}>
                <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.success} style={{ marginTop: 2 }} />
                <Text style={[type.body, { fontSize: 17, lineHeight: 23, flex: 1, marginLeft: space.sm }]}>{c}</Text>
              </View>
            ))}
            <Pressable
              onPress={() => Linking.openURL(EVIDENCE_URL).catch(() => {})}
              accessibilityRole="link"
              accessibilityLabel="Read the full test results. Opens in browser."
              style={({ pressed }) => [st.source, { marginTop: space.sm, marginBottom: 0 }, pressed && { backgroundColor: colors.primarySoft }]}
            >
              <Text style={[type.label, { flex: 1, color: colors.primary }]}>Read the full test results</Text>
              <MaterialCommunityIcons name="open-in-new" size={20} color={colors.primary} />
            </Pressable>
          </View>

          {liveSources.length > 0 && (
            <Section title="Checked just now with Gemini 4 + Google Search" sources={liveSources} live />
          )}
          {groups.map((g) => (
            <Section key={g.name} title={g.name} sources={g.sources} />
          ))}
          {extra.length > 0 && <Section title="Other sources" sources={extra} />}
          {liveSources.length === 0 && groups.length === 0 && extra.length === 0 && (
            <>
              <Gap h={space.xl} />
              <Text style={type.bodyMuted}>Source links will appear here once prices are researched.</Text>
            </>
          )}
          <Gap h={space.xl} />
          <Text style={[type.small, { textAlign: "center" }]}>Sample estimate for illustration. Not a real quote.</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Section({ title, sources, live }: { title: string; sources: PriceSource[]; live?: boolean }) {
  return (
    <View style={{ marginTop: space.xl }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.sm }}>
        {live && <View style={st.liveDot} />}
        <Text style={type.label} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {sources.map((src) => (
        <Pressable
          key={src.url}
          onPress={() => Linking.openURL(src.url).catch(() => {})}
          accessibilityRole="link"
          accessibilityLabel={`${src.title || hostOf(src.url)}. Opens in browser.`}
          style={({ pressed }) => [st.source, pressed && { backgroundColor: colors.primarySoft }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { fontSize: 17, lineHeight: 23, color: colors.primary }]} numberOfLines={2}>
              {src.title || hostOf(src.url)}
            </Text>
            <Text style={type.small} numberOfLines={1}>
              {hostOf(src.url)}
            </Text>
          </View>
          <MaterialCommunityIcons name="open-in-new" size={20} color={colors.primary} style={{ marginLeft: space.sm }} />
        </Pressable>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  close: { minHeight: 44, justifyContent: "center", paddingLeft: space.md },
  method: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: space.lg,
  },
  source: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: MIN_TAP,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginBottom: space.sm,
  },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, marginRight: space.sm },
  checks: {
    marginTop: space.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
});
