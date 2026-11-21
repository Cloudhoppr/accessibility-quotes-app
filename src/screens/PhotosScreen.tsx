import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { ActionSheetIOS, ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../ui/Text";
import type { Photo, PhotoSlot } from "../contracts";
import { SAMPLE_PHOTOS, SAMPLE_ROOM } from "../data/sample";
import { useSession } from "../state/session";
import { Banner, Body, Card, Gap, IconBadge, Pill, PrimaryButton, Screen, Title, type IconName } from "../ui/components";
import { pickPhoto } from "../ui/photo";
import { colors, MIN_TAP, radius, space, type } from "../ui/theme";
import { noteDebug } from "./DebugScreen";

interface SlotDef {
  slot: PhotoSlot;
  title: string;
  icon: IconName;
  guide: string;
}

const SLOTS: SlotDef[] = [
  {
    slot: "toilet",
    title: "Toilet area",
    icon: "toilet",
    guide: "Stand in the doorway and include the wall next to the toilet.",
  },
  {
    slot: "bath",
    title: "Tub or shower",
    icon: "shower",
    guide: "Show the whole tub or shower, with the walls and taps.",
  },
  {
    slot: "other",
    title: "Anything else (sink, taps)",
    icon: "faucet",
    guide: "The sink, the taps, or anything else that worries you.",
  },
];

export default function PhotosScreen() {
  const { s, set, go } = useSession();
  const [busy, setBusy] = useState<PhotoSlot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Toilet photo is required unless a scan (or the sample) showed there is no toilet.
  const required = (slot: PhotoSlot) =>
    (slot === "toilet" && (s.room.hasToilet || s.room.source === "none")) || (slot === "bath" && s.room.hasTub);
  const photoFor = (slot: PhotoSlot) => s.photos.find((p) => p.slot === slot);
  const missing = SLOTS.filter((d) => required(d.slot) && !photoFor(d.slot));
  const ready = missing.length === 0;

  const savePhoto = (photo: Photo) =>
    set((prev) => ({ photos: [...prev.photos.filter((p) => p.slot !== photo.slot), photo] }));

  const take = async (slot: PhotoSlot, from: "camera" | "library") => {
    setNotice(null);
    setBusy(slot);
    let out = await pickPhoto(slot, from);
    // Camera refused or unavailable (e.g. simulator): fall back to the library once.
    if (from === "camera" && (out.kind === "denied" || out.kind === "error")) {
      if (out.kind === "error") noteDebug("camera error", out.message);
      setNotice("The camera isn't available, so we opened your photo library instead.");
      out = await pickPhoto(slot, "library");
    }
    setBusy(null);
    if (out.kind === "ok") {
      savePhoto(out.photo);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (out.kind === "error") {
      noteDebug("photo error", out.message);
      setNotice("That photo didn't work. Please try again.");
    }
  };

  const choose = (slot: PhotoSlot) => {
    if (busy) return;
    if (Platform.OS !== "ios") return void take(slot, "camera");
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ["Take a photo", "Choose from my photos", "Cancel"], cancelButtonIndex: 2, title: "Add a photo" },
      (i) => {
        if (i === 0) void take(slot, "camera");
        else if (i === 1) void take(slot, "library");
      }
    );
  };

  const useSamples = () => {
    setNotice(null);
    set({ room: SAMPLE_ROOM, scanJsonUri: null, photos: SAMPLE_PHOTOS, step: "analyzing" });
  };

  return (
    <Screen
      stage={1}
      onBack={() => go("scan")}
      footer={
        <>
          {!ready && (
            <Text style={st.hint} accessibilityLiveRegion="polite">
              Add the {missing.map((m) => m.title.toLowerCase()).join(" and ")} photo to continue.
            </Text>
          )}
          <PrimaryButton label="Check my bathroom" icon="arrow-right" onPress={() => go("analyzing")} disabled={!ready || !!busy} />
          <Pressable onPress={useSamples} accessibilityRole="button" accessibilityLabel="Use sample photos" style={({ pressed }) => [st.link, pressed && { opacity: 0.6 }]}>
            <Text style={[type.label, { color: colors.primary, textDecorationLine: "underline" }]}>Use sample photos</Text>
          </Pressable>
        </>
      }
    >
      <Title>Take a few photos</Title>
      <Body muted>Photos help us spot what's already there. Please keep people out of the photos.</Body>
      {notice && (
        <>
          <Gap />
          <Banner text={notice} />
        </>
      )}
      <Gap h={space.xl} />
      {SLOTS.map((d) => (
        <SlotCard key={d.slot} def={d} required={required(d.slot)} photo={photoFor(d.slot)} busy={busy === d.slot} onPick={() => choose(d.slot)} />
      ))}
    </Screen>
  );
}

function SlotCard({ def, required, photo, busy, onPick }: { def: SlotDef; required: boolean; photo?: Photo; busy: boolean; onPick: () => void }) {
  return (
    <Card style={{ marginBottom: space.lg }}>
      <View style={st.head}>
        <IconBadge name={def.icon} size={48} tone={photo ? "success" : "primary"} />
        <View style={{ flex: 1, marginLeft: space.md }}>
          <Text style={type.heading}>{def.title}</Text>
        </View>
        {photo ? (
          <Pill label="Done" tone="success" icon="check" />
        ) : (
          <Pill label={required ? "Needed" : "Optional"} tone={required ? "primary" : "neutral"} />
        )}
      </View>
      <Text style={[type.bodyMuted, { marginTop: space.md }]}>{def.guide}</Text>
      <Gap h={space.md} />
      {busy ? (
        <View style={[st.drop, { borderStyle: "solid" }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[type.small, { marginTop: space.sm }]}>Getting your photo ready…</Text>
        </View>
      ) : photo ? (
        <View>
          <Image source={{ uri: photo.uri }} style={st.thumb} resizeMode="cover" accessibilityLabel={`Photo of ${def.title.toLowerCase()}`} />
          <Pressable
            onPress={onPick}
            accessibilityRole="button"
            accessibilityLabel={`Retake ${def.title.toLowerCase()} photo`}
            style={({ pressed }) => [st.retake, pressed && { backgroundColor: colors.primarySoft }]}
          >
            <MaterialCommunityIcons name="camera-retake" size={22} color={colors.primary} />
            <Text style={[type.label, { color: colors.primary, marginLeft: space.sm }]}>Retake</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={onPick}
          accessibilityRole="button"
          accessibilityLabel={`Add ${def.title.toLowerCase()} photo`}
          style={({ pressed }) => [st.drop, pressed && { backgroundColor: colors.primarySoft }]}
        >
          <MaterialCommunityIcons name="camera-plus" size={34} color={colors.primary} />
          <Text style={[type.label, { color: colors.primary, marginTop: space.xs }]}>Add photo</Text>
        </Pressable>
      )}
    </Card>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center" },
  drop: {
    minHeight: 120,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.primary,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  retake: {
    marginTop: space.md,
    minHeight: MIN_TAP - 8,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { ...type.small, textAlign: "center" },
  link: { minHeight: 44, alignItems: "center", justifyContent: "center" },
});
