// Stage 2: what would help most, with the AI before/after preview and include-in-estimate checkboxes.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { StyleSheet, Text, View } from "react-native";
import type { FixtureId, ForWhom, IntakeAnswers, Suggestion } from "../contracts";
import { FIXTURES, STRENGTH_LABEL } from "../fixtures";
import { shouldUseRecorded } from "../flow/runAnalysis";
import { alreadyInPlace } from "../logic/select";
import { useSession } from "../state/session";
import BeforeAfter from "../ui/BeforeAfter";
import { Body, Card, Gap, IconBadge, Pill, PrimaryButton, Screen, SecondaryButton, Title, type IconName } from "../ui/components";
import { colors, radius, space, type } from "../ui/theme";

const HEADER: Record<ForWhom, { title: string; sub: string }> = {
  self: { title: "Here's what would help you most", sub: "Based on your bathroom and your answers." },
  parent: { title: "Here's what would help your loved one most", sub: "Based on their bathroom and your answers." },
  care: { title: "Here's what would help most", sub: "Based on the bathroom and your answers." },
};

const STRENGTH_TONE = { strong: "primary", recommended: "accent", consider: "neutral" } as const;

export default function SuggestionsScreen() {
  const { s, set, go, reset } = useSession();
  const header = HEADER[s.intake.forWhom] ?? HEADER.care;
  const decision = s.decision?.value ?? null;
  const quickCheck = s.decision?.source === "fallback" && !shouldUseRecorded(s);
  const suggested = new Set(s.suggestions.map((x) => x.fixtureId));
  const inPlace = (decision ? (alreadyInPlace(decision) as FixtureId[]) : []).filter((id) => FIXTURES[id] && !suggested.has(id));
  const pv = s.preview;
  const showPreview = !!pv.fixtureId && (pv.state === "loading" || pv.state === "ready");
  const count = s.selected.length;

  const toggle = (id: FixtureId) => {
    Haptics.selectionAsync().catch(() => {});
    set((prev) => ({
      selected: prev.selected.includes(id) ? prev.selected.filter((x) => x !== id) : [...prev.selected, id],
    }));
  };

  return (
    <Screen
      stage={2}
      footer={
        <>
          <PrimaryButton
            label="See cost estimate"
            icon="arrow-right"
            disabled={count === 0}
            onPress={() => go("estimate")}
          />
          <SecondaryButton label="Start over" onPress={() => reset(true)} />
        </>
      }
    >
      <Title>{header.title}</Title>
      <Body muted>{header.sub} Tap a card to include it in your estimate.</Body>
      {quickCheck && (
        <View style={st.quick} accessible accessibilityLabel="Quick check used">
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.inkMuted} />
          <Text style={[type.small, { marginLeft: 4 }]}>Quick check used</Text>
        </View>
      )}
      <Gap h={space.xl} />

      {showPreview && pv.fixtureId && (
        <>
          <Card>
            <Text style={[type.heading, { marginBottom: space.xs }]} accessibilityRole="header">
              See it in your bathroom
            </Text>
            <Text style={[type.bodyMuted, { marginBottom: space.md }]}>{FIXTURES[pv.fixtureId].label}</Text>
            <BeforeAfter
              beforeUri={pv.beforeUri}
              afterUri={pv.afterUri}
              state={pv.state === "ready" ? "ready" : "loading"}
              fixtureLabel={FIXTURES[pv.fixtureId].label}
            />
          </Card>
          <Gap h={space.xl} />
        </>
      )}

      {s.suggestions.map((sug, i) => (
        <View key={sug.fixtureId}>
          <SuggestionCard sug={sug} checked={s.selected.includes(sug.fixtureId)} onToggle={() => toggle(sug.fixtureId)} intake={s.intake} />
          {i < s.suggestions.length - 1 && <Gap h={space.lg} />}
        </View>
      ))}

      {inPlace.length > 0 && (
        <>
          <Gap h={space.xxl} />
          <Text style={type.heading} accessibilityRole="header">
            Already in place
          </Text>
          <Gap h={space.md} />
          <Card>
            {inPlace.map((id, i) => (
              <View
                key={id}
                style={[st.inPlaceRow, i > 0 && st.divider]}
                accessible
                accessibilityLabel={`${FIXTURES[id].label}. Nice, this is already there.`}
              >
                <IconBadge name="check" size={44} tone="success" />
                <View style={{ flex: 1, marginLeft: space.md }}>
                  <Text style={type.label}>{FIXTURES[id].label}</Text>
                  <Text style={[type.small, { color: colors.success }]}>Nice — this is already there</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function SuggestionCard({
  sug,
  checked,
  onToggle,
  intake,
}: {
  sug: Suggestion;
  checked: boolean;
  onToggle: () => void;
  intake: IntakeAnswers;
}) {
  const f = FIXTURES[sug.fixtureId];
  if (!f) return null;
  const strength = STRENGTH_LABEL[sug.strength];
  return (
    <Card
      onPress={onToggle}
      selected={checked}
      accessibilityLabel={`${f.label}. ${strength}. ${f.oneLiner} ${checked ? "Included in estimate" : "Not included in estimate"}. Double tap to ${checked ? "remove" : "include"}.`}
    >
      <View style={st.cardTop}>
        <IconBadge name={f.icon as IconName} size={56} tone={sug.strength === "recommended" ? "accent" : "primary"} />
        <View style={{ flex: 1, marginLeft: space.md }}>
          <Text style={[type.heading, { fontSize: 21 }]}>{f.label}</Text>
          <View style={{ marginTop: 6 }}>
            <Pill label={strength} tone={STRENGTH_TONE[sug.strength]} />
          </View>
        </View>
        <MaterialCommunityIcons
          name={checked ? "checkbox-marked" : "checkbox-blank-outline"}
          size={36}
          color={checked ? colors.primary : colors.inkMuted}
          style={{ marginLeft: space.sm }}
        />
      </View>
      <Gap h={space.md} />
      <Body>{f.oneLiner}</Body>
      <Gap h={space.md} />
      <Detail icon="heart-outline" label="Why it helps" text={f.why(intake)} />
      <Gap h={space.md} />
      <Detail icon="map-marker-outline" label="Where it goes" text={f.where} />
      <View style={[st.includeRow, checked && { backgroundColor: colors.primarySoft }]}>
        <Text style={[type.label, { color: checked ? colors.primary : colors.inkMuted }]}>
          {checked ? "Included in estimate" : "Tap to include in estimate"}
        </Text>
      </View>
    </Card>
  );
}

function Detail({ icon, label, text }: { icon: IconName; label: string; text: string }) {
  return (
    <View style={st.detail}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.primary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, marginLeft: space.sm }}>
        <Text style={[type.label, { color: colors.inkMuted }]}>{label}</Text>
        <Text style={[type.body, { fontSize: 18, lineHeight: 25 }]}>{text}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  quick: { flexDirection: "row", alignItems: "center", marginTop: space.sm },
  cardTop: { flexDirection: "row", alignItems: "center" },
  detail: { flexDirection: "row", alignItems: "flex-start" },
  includeRow: {
    marginTop: space.lg,
    minHeight: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  inPlaceRow: { flexDirection: "row", alignItems: "center", paddingVertical: space.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: space.sm, paddingTop: space.md },
});
