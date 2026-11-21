import { ExportType, ExpoRoomplan, ScanStatus, useRoomPlan } from "expo-roomplan";
import * as Haptics from "expo-haptics";
import { File } from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { RoomSummary } from "../contracts";
import { SAMPLE_ROOM } from "../data/sample";
import { EMPTY_ROOM, summarizeRoom } from "../scan/summarizeRoom";
import { useSession } from "../state/session";
import { Banner, Body, Card, Gap, IconBadge, Pill, PrimaryButton, Screen, SecondaryButton, Title } from "../ui/components";
import { colors, space, type } from "../ui/theme";
import { noteDebug } from "./DebugScreen";

type Phase = "idle" | "scanning" | "reading" | "done" | "failed";

interface DismissEvent {
  status?: ScanStatus;
  jsonUrl?: string;
  scanUrl?: string;
  errorMessage?: string;
}

const TIPS: string[] = [
  "A helper can do this step for you.",
  "Start in the doorway, then walk slowly around the room.",
  "Point the phone at the walls, the floor, the toilet and the tub.",
  "Tap Done when you finish. It takes about a minute.",
];

const PLAIN: Record<string, string> = {
  toilet: "toilet",
  bathtub: "bathtub",
  sink: "sink",
  storage: "cabinet",
  washerDryer: "washer",
  washer_dryer: "washer",
  chair: "chair",
  table: "table",
  stairs: "stairs",
};

function foundList(room: RoomSummary): string[] {
  const out: string[] = [];
  for (const o of room.objects) {
    const word = PLAIN[o.category] ?? o.category.replace(/[_-]/g, " ").toLowerCase();
    if (!out.includes(word)) out.push(word);
  }
  if (!out.length) {
    if (room.hasToilet) out.push("toilet");
    if (room.hasTub) out.push("bathtub");
    if (room.hasSink) out.push("sink");
  }
  return out;
}

export default function ScanScreen() {
  const { s, set, go } = useSession();
  const { startRoomPlan } = useRoomPlan({ exportType: ExportType.Parametric, sendFileLoc: true });
  const [phase, setPhase] = useState<Phase>(s.room.source === "scan" ? "done" : "idle");
  const [problem, setProblem] = useState<string | null>(null);
  const attempt = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Listen to every dismiss event directly: the hook's state does not change if two
  // attempts end the same way (e.g. Canceled twice), so it can't drive the UI alone.
  useEffect(() => {
    const sub = ExpoRoomplan.addListener?.("onDismissEvent", (e: DismissEvent) => {
      noteDebug("roomplan event", e);
      if (phaseRef.current !== "scanning") return;
      if (e.status === ScanStatus.OK && e.jsonUrl) {
        void readScan(e.jsonUrl);
      } else if (e.status === ScanStatus.OK) {
        // Finished but no file came back: keep going with photos.
        set({ room: { ...EMPTY_ROOM, source: "scan" }, scanJsonUri: null });
        setPhase("done");
      } else {
        setProblem(e.errorMessage ?? null);
        setPhase("failed");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
    });
    return () => sub?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readScan = async (jsonUrl: string) => {
    setPhase("reading");
    try {
      const uri = jsonUrl.startsWith("file://") ? jsonUrl : `file://${jsonUrl}`;
      const text = await new File(uri).text();
      noteDebug("scan json", `length=${text.length}\n${text.slice(0, 1200)}`);
      const room = summarizeRoom(JSON.parse(text), "scan");
      set({ room, scanJsonUri: uri });
      setPhase("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      noteDebug("scan read error", String(e));
      setProblem(null);
      setPhase("failed");
    }
  };

  const startScan = async () => {
    setProblem(null);
    setPhase("scanning");
    attempt.current += 1;
    const name = attempt.current === 1 ? "SafeStepScan" : `SafeStepScan${attempt.current}`;
    try {
      await startRoomPlan(name);
    } catch (e) {
      noteDebug("roomplan start error", String(e));
      setPhase("failed");
    }
  };

  const skip = () => {
    set({ room: EMPTY_ROOM, scanJsonUri: null, step: "photos" });
  };
  const useSample = () => {
    set({ room: SAMPLE_ROOM, scanJsonUri: null, step: "photos" });
  };

  const sampleLink = <TextLink label="Use the sample bathroom" onPress={useSample} />;

  let footer;
  if (phase === "done") {
    footer = (
      <>
        <PrimaryButton label="Continue" icon="arrow-right" onPress={() => go("photos")} />
        <SecondaryButton label="Scan again" icon="refresh" onPress={startScan} />
      </>
    );
  } else if (phase === "failed") {
    footer = (
      <>
        <PrimaryButton label="Try the scan again" icon="refresh" onPress={startScan} />
        <SecondaryButton label="Skip the scan" onPress={skip} />
        {sampleLink}
      </>
    );
  } else {
    footer = (
      <>
        <PrimaryButton label="Start room scan" icon="cube-scan" onPress={startScan} loading={phase !== "idle"} />
        <SecondaryButton label="Skip the scan" onPress={skip} />
        {sampleLink}
      </>
    );
  }

  return (
    <Screen stage={1} onBack={() => go("intake")} footer={footer}>
      {phase === "done" ? (
        <DoneView room={s.room} />
      ) : phase === "scanning" || phase === "reading" ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Gap h={space.xl} />
          <Title style={{ textAlign: "center" }}>{phase === "reading" ? "Reading your scan…" : "Scanning…"}</Title>
          <Body muted style={{ textAlign: "center" }}>
            {phase === "reading" ? "Just a moment." : "Follow the steps on the screen. Tap Done when the outline looks complete."}
          </Body>
        </View>
      ) : (
        <>
          <IconBadge name="cube-scan" size={72} />
          <Gap h={space.lg} />
          <Title>Let's scan the bathroom</Title>
          <Body muted>Your phone makes a simple outline of the room so we can see what's there.</Body>
          {phase === "failed" && (
            <>
              <Gap />
              <Banner tone="danger" text="Scan didn't finish. Try again, or skip and use photos only." />
            </>
          )}
          <Gap h={space.xl} />
          <Card>
            {TIPS.map((t, i) => (
              <View key={t} style={[st.tip, i > 0 && st.tipDivider]} accessible accessibilityLabel={`Step ${i + 1}. ${t}`}>
                <View style={st.num}>
                  <Text style={st.numText}>{i + 1}</Text>
                </View>
                <Text style={[type.body, { flex: 1 }]}>{t}</Text>
              </View>
            ))}
          </Card>
          {problem ? <Text style={[type.small, { marginTop: space.md }]}>{problem}</Text> : null}
        </>
      )}
    </Screen>
  );
}

function DoneView({ room }: { room: RoomSummary }) {
  const found = foundList(room);
  const extras: string[] = [];
  if (room.wallCount) extras.push(`${room.wallCount} walls`);
  if (room.doorCount) extras.push(`${room.doorCount} ${room.doorCount === 1 ? "door" : "doors"}`);
  if (room.approxFloorM2) extras.push(`about ${Math.round(room.approxFloorM2 * 10.764)} sq ft`);
  return (
    <>
      <IconBadge name="check-circle" size={72} tone="success" />
      <Gap h={space.lg} />
      <Title>Scan complete</Title>
      <Body muted>Nice work. Next, a few photos help us see the details.</Body>
      <Gap h={space.xl} />
      <Card>
        <Text style={type.label}>{found.length ? "We found" : "We saved the room's shape"}</Text>
        <Gap h={space.md} />
        {found.length ? (
          <View style={st.pills} accessible accessibilityLabel={`Found: ${found.join(", ")}`}>
            {found.map((f) => (
              <Pill key={f} label={f[0].toUpperCase() + f.slice(1)} tone="success" icon="check" />
            ))}
          </View>
        ) : (
          <Body muted>Photos will show us the toilet, tub and taps.</Body>
        )}
        {extras.length > 0 && <Text style={[type.small, { marginTop: space.md }]}>{extras.join(" · ")}</Text>}
      </Card>
    </>
  );
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [st.link, pressed && { opacity: 0.6 }]}>
      <Text style={[type.label, { color: colors.primary, textDecorationLine: "underline" }]}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: "center", paddingTop: space.xxl * 2 },
  tip: { flexDirection: "row", alignItems: "center", paddingVertical: space.md, gap: space.lg },
  tipDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  num: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  numText: { fontSize: 18, fontWeight: "800", color: colors.primary },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  link: { minHeight: 44, alignItems: "center", justifyContent: "center" },
});
