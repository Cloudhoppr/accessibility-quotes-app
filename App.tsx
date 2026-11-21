import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Step } from "./src/contracts";
import AnalyzingScreen from "./src/screens/AnalyzingScreen";
import { DebugProvider, useDebug } from "./src/screens/DebugScreen";
import EstimateScreen from "./src/screens/EstimateScreen";
import IntakeScreen from "./src/screens/IntakeScreen";
import PhotosScreen from "./src/screens/PhotosScreen";
import ScanScreen from "./src/screens/ScanScreen";
import SuggestionsScreen from "./src/screens/SuggestionsScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import { SessionProvider, useSession } from "./src/state/session";
import { ErrorBoundary, installGlobalErrorHandler } from "./src/ui/ErrorBoundary";
import { colors } from "./src/ui/theme";

installGlobalErrorHandler();

// Respect "Reduce Motion": checked once, updated live; never blocks rendering.
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => (reduceMotion = v))
  .catch(() => {});
AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v: boolean) => (reduceMotion = v));

const SCREENS: Record<Step, ComponentType> = {
  welcome: WelcomeScreen,
  intake: IntakeScreen,
  scan: ScanScreen,
  photos: PhotosScreen,
  analyzing: AnalyzingScreen,
  suggestions: SuggestionsScreen,
  estimate: EstimateScreen,
};

const ORDER: Step[] = ["welcome", "intake", "scan", "photos", "analyzing", "suggestions", "estimate"];

export default function App() {
  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <StatusBar style="dark" />
      <ErrorBoundary>
        <SessionProvider>
          <DebugProvider>
            <Router />
          </DebugProvider>
        </SessionProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

function Router() {
  const { s } = useSession();
  const { open } = useDebug();
  const prev = useRef<Step>(s.step);
  const forward = ORDER.indexOf(s.step) >= ORDER.indexOf(prev.current);
  useEffect(() => {
    prev.current = s.step;
  }, [s.step]);

  const Current = SCREENS[s.step];
  return (
    <View
      style={st.root}
      // Hidden: a three-finger touch anywhere opens the debug overlay.
      onTouchStart={(e) => {
        if (e.nativeEvent.touches.length >= 3) open();
      }}
    >
      <Transition key={s.step} forward={forward}>
        <Current />
      </Transition>
    </View>
  );
}

function Transition({ children, forward }: { children: ReactNode; forward: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) t.setValue(1);
    else Animated.timing(t, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [t]);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [forward ? 24 : -24, 0] });
  return <Animated.View style={[st.root, { opacity: t, transform: [{ translateX }] }]}>{children}</Animated.View>;
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
