import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { enableScreens } from "react-native-screens";
import type { RootStackParamList } from "./src/navigation/types";
import { I18nProvider, useI18n } from "./src/i18n/i18n";
import { SplashScreen } from "./src/screens/SplashScreen";
import { StartScreen } from "./src/screens/StartScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { RecordScreen } from "./src/screens/RecordScreen";
import { EmotionSummaryScreen } from "./src/screens/EmotionSummaryScreen";
import { AssistantScreen } from "./src/screens/AssistantScreen";
import { ReviewScreen } from "./src/screens/ReviewScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { SummaryScreen } from "./src/screens/SummaryScreen";
import { AutobiographyScreen } from "./src/screens/AutobiographyScreen";
import { Colors } from "./src/theme/colors";
import { flushPendingSync } from "./src/storage/sync";

enableScreens(true);

const Stack = createNativeStackNavigator<RootStackParamList>();

function isWebOfflineDemo() {
  // web only: allow opening a URL to show offline mode quickly
  // Example: http://localhost:8081/?offline=1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = typeof window !== "undefined" ? (window as any) : null;
  const qs = w?.location?.search ? String(w.location.search) : "";
  if (!qs) return false;
  try {
    const p = new URLSearchParams(qs);
    return p.get("offline") === "1";
  } catch {
    return false;
  }
}

function seedWebOfflineDemo() {
  // Only for web demo/debug. No effect on native.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = typeof window !== "undefined" ? (window as any) : null;
  if (!w?.localStorage) return;
  if (!isWebOfflineDemo()) return;

  try {
    // 1) profile: skip Start screen
    w.localStorage.setItem(
      "@my-everything/profile",
      JSON.stringify({ isAnonymous: true, createdAtISO: new Date().toISOString() })
    );
  } catch {
    // ignore
  }

  try {
    // 2) mentor quota: force "daily limit reached" so offline response is shown
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dayKey = `${y}-${m}-${day}`;
    w.localStorage.setItem(
      "@my-everything/mentorQuota",
      JSON.stringify({ day: dayKey, reqCount: 5, tokenCount: 0, lastAtMs: Date.now() - 120000 })
    );
  } catch {
    // ignore
  }
}

// Seed as early as possible (module load) so Splash/Start checks see it.
seedWebOfflineDemo();

function AppInner() {
  const { t } = useI18n();
  useEffect(() => {
    // best-effort: try flushing any pending server sync queue
    flushPendingSync().catch(() => {});
  }, []);
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName={isWebOfflineDemo() ? "Assistant" : "Splash"}
        screenOptions={{
          headerTintColor: Colors.primary,
          headerStyle: { backgroundColor: Colors.bg },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Colors.bg },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Start" component={StartScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Record" component={RecordScreen} options={{ title: t("recordTitle") }} />
        <Stack.Screen
          name="EmotionSummary"
          component={EmotionSummaryScreen}
          options={{ title: t("emotionSummaryTitle") }}
        />
        <Stack.Screen name="Assistant" component={AssistantScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ title: t("reviewTitle") }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t("settingsTitle") }} />
        <Stack.Screen name="Summary" component={SummaryScreen} options={{ title: t("sectionSummary") }} />
        <Stack.Screen
          name="Autobiography"
          component={AutobiographyScreen}
          options={{ title: t("sectionAutobiography") }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}
