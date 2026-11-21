import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useRoomPlan, ExportType } from "expo-roomplan";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { BUILD_SHA, HAS_KEY } from "./src/config";

// Phase-0 smoke test: proves RoomPlan, camera + resize, file reading and the
// API key all work on the device before any feature code lands.
export default function App() {
  const { startRoomPlan, roomScanStatus, jsonUrl, scanUrl, errorMessage } = useRoomPlan({
    exportType: ExportType.Parametric,
    sendFileLoc: true,
  });
  const [log, setLog] = useState<string[]>([]);
  const add = (s: string) => setLog((l) => [`${new Date().toLocaleTimeString()}  ${s}`, ...l].slice(0, 40));

  useEffect(() => {
    add(`scan status=${roomScanStatus} json=${jsonUrl} usdz=${scanUrl} err=${errorMessage}`);
    if (jsonUrl) {
      (async () => {
        try {
          const uri = jsonUrl.startsWith("file://") ? jsonUrl : `file://${jsonUrl}`;
          const text = await new File(uri).text();
          add(`json length=${text.length} head=${text.slice(0, 1500)}`);
        } catch (e) {
          add(`json read failed: ${String(e)}`);
        }
      })();
    }
  }, [roomScanStatus, jsonUrl, scanUrl, errorMessage]);

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return add("camera permission denied");
      const res = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (res.canceled) return add("photo cancelled");
      const a = res.assets[0];
      const out = await manipulateAsync(a.uri, [{ resize: { width: 1024 } }], {
        compress: 0.7,
        format: SaveFormat.JPEG,
        base64: true,
      });
      add(`photo ${a.width}x${a.height} -> ${out.width}x${out.height}, base64 ${Math.round((out.base64?.length ?? 0) / 1024)} KB`);
    } catch (e) {
      add(`photo failed: ${String(e)}`);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.root}>
        <StatusBar style="dark" />
        <Text style={s.h1}>SafeStep smoke test</Text>
        <Text style={s.meta}>build {BUILD_SHA} · API key {HAS_KEY ? "present" : "MISSING"}</Text>
        <View style={s.row}>
          <Pressable style={s.btn} onPress={() => startRoomPlan("SmokeScan").catch((e) => add(`scan threw: ${e}`))}>
            <Text style={s.btnText}>Scan room</Text>
          </Pressable>
          <Pressable style={s.btn} onPress={takePhoto}>
            <Text style={s.btnText}>Take photo</Text>
          </Pressable>
        </View>
        <ScrollView style={s.log}>
          {log.map((l, i) => (
            <Text key={i} style={s.logLine} selectable>
              {l}
            </Text>
          ))}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F3EE", padding: 16 },
  h1: { fontSize: 28, fontWeight: "700", color: "#1D2B36" },
  meta: { fontSize: 16, color: "#4A5A66", marginTop: 4 },
  row: { flexDirection: "row", gap: 12, marginVertical: 16 },
  btn: { flex: 1, backgroundColor: "#1F6F5C", borderRadius: 14, paddingVertical: 18, alignItems: "center" },
  btnText: { color: "white", fontSize: 18, fontWeight: "600" },
  log: { flex: 1, backgroundColor: "white", borderRadius: 12, padding: 10 },
  logLine: { fontSize: 12, fontFamily: "Menlo", color: "#222", marginBottom: 8 },
});
