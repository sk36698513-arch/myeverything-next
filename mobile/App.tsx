import React from "react";
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

enableScreens(true);

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppInner() {
  const { t } = useI18n();
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Splash"
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
        <Stack.Screen name="Assistant" component={AssistantScreen} options={{ title: t("aiAssistant") }} />
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
