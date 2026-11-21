// Soft animated sweep used as a loading placeholder. Animated-only, no extra deps.
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "./theme";

export default function Shimmer({
  style,
  base = colors.surfaceAlt,
  highlight = "rgba(255,255,255,0.65)",
  durationMs = 1400,
}: {
  style?: StyleProp<ViewStyle>;
  base?: string;
  highlight?: string;
  durationMs?: number;
}) {
  const [w, setW] = useState(0);
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!w) return;
    t.setValue(0);
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: durationMs, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [w, durationMs, t]);

  const band = Math.max(w * 0.6, 120);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-band, w + band] });

  return (
    <View
      style={[{ backgroundColor: base, overflow: "hidden" }, style]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {w > 0 && (
        <Animated.View style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: band, transform: [{ translateX }] }}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", highlight, "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}
