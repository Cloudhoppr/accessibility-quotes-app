import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ForWhom, Mobility, Worry } from "../contracts";
import { SAMPLE_PHOTOS, SAMPLE_ROOM } from "../data/sample";
import { useSession } from "../state/session";
import { Body, ChoiceChip, Pill, PrimaryButton, Screen, Title, type IconName } from "../ui/components";
import { space, type } from "../ui/theme";

const WHO: { id: ForWhom; label: string; icon: IconName }[] = [
  { id: "self", label: "Myself", icon: "account" },
  { id: "parent", label: "A parent or relative", icon: "account-heart" },
  { id: "care", label: "Someone I care for", icon: "hand-heart" },
];

const MOBILITY: { id: Mobility; self: string; other: string; icon: IconName }[] = [
  { id: "independent", self: "I walk without help", other: "Walks without help", icon: "walk" },
  { id: "cane_walker", self: "I use a cane or walker", other: "Uses a cane or walker", icon: "human-cane" },
  { id: "wheelchair", self: "I use a wheelchair", other: "Uses a wheelchair", icon: "wheelchair-accessibility" },
];

const WORRIES: { id: Worry; label: string; icon: IconName }[] = [
  { id: "sit_stand", label: "Sitting down or standing up", icon: "seat-outline" },
  { id: "tub_transfer", label: "Getting in or out of the tub", icon: "bathtub-outline" },
  { id: "slipping", label: "Slipping", icon: "water-alert" },
  { id: "gripping", label: "Turning taps or knobs", icon: "faucet" },
];

export default function IntakeScreen() {
  const { s, set, go } = useSession();
  const { intake } = s;
  const self = intake.forWhom === "self";

  const patch = (p: Partial<typeof intake>) => set((prev) => ({ intake: { ...prev.intake, ...p } }));
  const toggleWorry = (w: Worry) =>
    set((prev) => {
      const has = prev.intake.worries.includes(w);
      return { intake: { ...prev.intake, worries: has ? prev.intake.worries.filter((x) => x !== w) : [...prev.intake.worries, w] } };
    });

  const usingSample = s.demoMode || s.room.source === "sample";

  const next = () => {
    if (usingSample) {
      // Demo / sample: skip the scan and photo steps.
      set({ room: SAMPLE_ROOM, scanJsonUri: null, photos: SAMPLE_PHOTOS, step: "analyzing" });
    } else {
      go("scan");
    }
  };

  return (
    <Screen
      stage={0}
      onBack={() => go("welcome")}
      footer={<PrimaryButton label={usingSample ? "See suggestions" : "Continue"} icon="arrow-right" onPress={next} />}
    >
      {usingSample && (
        <View style={{ marginBottom: space.md }}>
          <Pill label="Using the sample bathroom" tone="accent" icon="home-heart" />
        </View>
      )}
      <Title>A few quick questions</Title>
      <Body muted>Just tap. This helps us suggest the right things.</Body>

      <Section title="Who is this for?">
        {WHO.map((o) => (
          <ChoiceChip key={o.id} label={o.label} icon={o.icon} selected={intake.forWhom === o.id} onPress={() => patch({ forWhom: o.id })} />
        ))}
      </Section>

      <Section title={self ? "How do you get around?" : "How do they get around?"}>
        {MOBILITY.map((o) => (
          <ChoiceChip
            key={o.id}
            label={self ? o.self : o.other}
            icon={o.icon}
            selected={intake.mobility === o.id}
            onPress={() => patch({ mobility: o.id })}
          />
        ))}
      </Section>

      <Section title={self ? "What worries you most?" : "What worries you most for them?"} hint="Optional. Pick any that apply.">
        {WORRIES.map((o) => (
          <ChoiceChip key={o.id} label={o.label} icon={o.icon} selected={intake.worries.includes(o.id)} onPress={() => toggleWorry(o.id)} />
        ))}
      </Section>
    </Screen>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={st.section}>
      <Text style={type.heading} accessibilityRole="header">
        {title}
      </Text>
      {hint ? <Text style={[type.small, { marginTop: 2 }]}>{hint}</Text> : null}
      <View style={{ height: space.md }} />
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  section: { marginTop: space.xxl },
});
