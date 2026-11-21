// Top-level safety net (M9): render errors AND fatal JS errors (via ErrorUtils) show a
// friendly "Start over" screen instead of the app silently closing in a Release build.
import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { noteDebug } from "../screens/DebugScreen";
import { Body, Gap, IconBadge, PrimaryButton, Title } from "./components";
import { colors, radius, space } from "./theme";

// ---------- fatal-error store fed by the global handler ----------
let fatal: Error | null = null;
const listeners = new Set<() => void>();

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(typeof e === "string" ? e : JSON.stringify(e));
}

export function reportFatal(e: unknown) {
  fatal = toError(e);
  listeners.forEach((l) => l());
}

let installed = false;
/** Route fatal JS errors to the on-screen fallback. Safe to call more than once. */
export function installGlobalErrorHandler() {
  if (installed) return;
  const EU = (globalThis as any).ErrorUtils as
    | { setGlobalHandler?: (h: (e: unknown, isFatal?: boolean) => void) => void; getGlobalHandler?: () => (e: unknown, isFatal?: boolean) => void }
    | undefined;
  if (!EU || typeof EU.setGlobalHandler !== "function") return;
  installed = true;
  const prev = typeof EU.getGlobalHandler === "function" ? EU.getGlobalHandler() : undefined;
  EU.setGlobalHandler((error, isFatal) => {
    try {
      const err = toError(error);
      noteDebug(isFatal ? "fatal" : "error", `${err.message}\n${(err.stack ?? "").slice(0, 600)}`);
    } catch {}
    if (isFatal) reportFatal(error);
    // In dev keep the red box; in Release never call the default (it closes the app).
    if (__DEV__ && prev) prev(error, isFatal);
  });
}

// ---------- boundary ----------
interface State {
  error: Error | null;
  resetKey: number;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, resetKey: 0 };
  private unsub: (() => void) | null = null;

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: toError(error) };
  }

  componentDidMount() {
    const fn = () => {
      if (fatal) this.setState({ error: fatal });
    };
    listeners.add(fn);
    this.unsub = () => listeners.delete(fn);
    fn();
  }

  componentWillUnmount() {
    this.unsub?.();
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    try {
      noteDebug("render error", `${error.message}\n${(info.componentStack ?? "").slice(0, 600)}`);
    } catch {}
  }

  private startOver = () => {
    fatal = null;
    // New key remounts the SessionProvider below, i.e. a fresh session.
    this.setState((p) => ({ error: null, resetKey: p.resetKey + 1 }));
  };

  render() {
    const { error, resetKey } = this.state;
    if (!error) return <Fragment key={resetKey}>{this.props.children}</Fragment>;
    return <ErrorFallback error={error} onReset={this.startOver} />;
  }
}

export function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <SafeAreaView style={st.root} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={st.body}>
        <IconBadge name="lifebuoy" size={84} tone="accent" />
        <Gap h={space.xl} />
        <Title>Sorry, something went wrong</Title>
        <Body muted>Nothing is lost. Tap "Start over" to begin again from the first screen.</Body>
        <Gap h={space.xl} />
        <View style={st.details} accessible accessibilityLabel={`Error details: ${error.message}`}>
          <Text style={st.detailsLabel}>Details for the team</Text>
          <Text selectable style={st.mono} numberOfLines={8}>
            {error.message || String(error)}
          </Text>
        </View>
      </ScrollView>
      <View style={st.footer}>
        <PrimaryButton label="Start over" icon="restart" onPress={onReset} />
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.xl, paddingTop: space.xxl * 1.5 },
  details: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.lg },
  detailsLabel: { fontSize: 15, fontWeight: "700", color: colors.inkMuted, marginBottom: space.xs },
  mono: { fontFamily: "Menlo", fontSize: 13, lineHeight: 18, color: colors.ink },
  footer: { paddingHorizontal: space.xl, paddingVertical: space.md },
});
