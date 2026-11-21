// Hidden debug overlay (M9). Opened by long-pressing the title on Welcome, the build
// line on Welcome, or a three-finger touch anywhere.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { Text } from "../ui/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCallLog, subscribeCallLog } from "../ai/log";
import { BUILD_SHA, HAS_KEY } from "../config";
import { useSession } from "../state/session";
import { Gap, SecondaryButton } from "../ui/components";
import { colors, radius, space, type } from "../ui/theme";

// ---------- tiny debug-notes store (raw RoomPlan events, last JS errors, ...) ----------
const notes: Record<string, { at: string; value: string }> = {};
const noteListeners = new Set<() => void>();
let notesVersion = 0;

export function noteDebug(key: string, value: unknown) {
  let text: string;
  try {
    text = typeof value === "string" ? value : JSON.stringify(value, null, 1);
  } catch {
    text = String(value);
  }
  notes[key] = { at: new Date().toLocaleTimeString(), value: (text ?? "undefined").slice(0, 4000) };
  notesVersion++;
  noteListeners.forEach((l) => l());
}

function subscribeNotes(fn: () => void) {
  noteListeners.add(fn);
  return () => {
    noteListeners.delete(fn);
  };
}

// ---------- provider: lets any screen open the overlay ----------
const DebugCtx = createContext<{ open: () => void }>({ open: () => {} });

export function useDebug() {
  return useContext(DebugCtx);
}

export function DebugProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <DebugCtx.Provider value={value}>
      {children}
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
        {visible && <DebugScreen onClose={() => setVisible(false)} />}
      </Modal>
    </DebugCtx.Provider>
  );
}

// ---------- the screen ----------
export default function DebugScreen({ onClose }: { onClose?: () => void }) {
  const { s, set, reset } = useSession();
  const [calls, setCalls] = useState(getCallLog);
  useEffect(() => subscribeCallLog(() => setCalls(getCallLog())), []);
  useSyncExternalStore(subscribeNotes, () => notesVersion);

  const d = s.decision;
  const lp = s.livePrices;

  return (
    <SafeAreaView style={st.root} edges={["bottom"]}>
      <View style={st.header}>
        <Text style={type.heading} accessibilityRole="header">
          Debug
        </Text>
        {onClose && (
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close debug" hitSlop={12} style={st.close}>
            <MaterialCommunityIcons name="close" size={28} color={colors.ink} />
          </Pressable>
        )}
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
        <Row k="Build" v={BUILD_SHA} />
        <Row k="API key present" v={HAS_KEY ? "yes" : "no"} />
        <Row k="Step" v={s.step} />
        <View style={st.row}>
          <Text style={type.label}>Demo mode</Text>
          <Switch
            value={s.demoMode}
            onValueChange={(v) => set({ demoMode: HAS_KEY ? v : true })}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityLabel="Demo mode"
          />
        </View>

        <Section title="Decision">
          <Mono>
            {d ? `source=${d.source}  ms=${d.ms}${d.error ? `\nerror=${d.error}` : ""}` : "not run yet"}
          </Mono>
          <Mono>
            {lp ? `live prices: source=${lp.source}  ms=${lp.ms}${lp.error ? `\nerror=${lp.error}` : ""}` : "live prices: not run yet"}
          </Mono>
          <Mono>{`preview: ${s.preview.state} ${s.preview.fixtureId ?? ""}`}</Mono>
        </Section>

        <Section title={`AI calls (${calls.length})`}>
          {calls.length === 0 && <Mono>none yet</Mono>}
          {calls.map((c, i) => (
            <View key={i} style={st.call}>
              <Mono>
                {`${c.at.slice(11, 19)}  ${c.label}  ${c.model}\nstatus=${c.status}  ${c.ms}ms  sent=${Math.round(c.bytesSent / 1024)}KB`}
                {c.error ? `\n${c.error.slice(0, 300)}` : ""}
              </Mono>
            </View>
          ))}
        </Section>

        <Section title="Room scan">
          <Mono>{`scanJsonUri: ${s.scanJsonUri ?? "none"}`}</Mono>
          <Mono>{JSON.stringify(s.room, null, 1)}</Mono>
          <Mono>{`photos: ${s.photos.map((p) => `${p.slot}(${p.source} ${p.width}x${p.height} ${Math.round(p.base64.length / 1024)}KB)`).join(", ") || "none"}`}</Mono>
        </Section>

        <Section title="Notes">
          {Object.keys(notes).length === 0 && <Mono>none</Mono>}
          {Object.entries(notes).map(([k, n]) => (
            <Mono key={k}>{`[${n.at}] ${k}: ${n.value}`}</Mono>
          ))}
        </Section>

        <Gap h={space.xl} />
        <SecondaryButton
          label="Reset app"
          icon="restart"
          onPress={() => {
            reset(false);
            onClose?.();
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={st.row}>
      <Text style={type.label}>{k}</Text>
      <Text style={[type.label, { color: colors.inkMuted }]}>{v}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: space.xl }}>
      <Text style={[type.label, { marginBottom: space.sm }]}>{title}</Text>
      <View style={st.box}>{children}</View>
    </View>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <Text selectable style={st.mono}>
      {children}
    </Text>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  box: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: colors.border },
  call: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: space.xs },
  mono: { fontFamily: "Menlo", fontSize: 12, lineHeight: 16, color: colors.ink },
});
