import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Colors } from "../theme/colors";
import { RootStackParamList } from "../navigation/types";
import { useI18n } from "../i18n/i18n";
import { loadProfile } from "../storage/profile";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export function SplashScreen({ navigation }: Props) {
  const { t } = useI18n();
  useEffect(() => {
    let cancelled = false;

    async function run() {
      // 스플래시 최소 노출 시간(원하면 여기만 늘리면 됨)
      const minMs = 2500;
      const delay = new Promise<void>((resolve) => setTimeout(resolve, minMs));

      const [profile] = await Promise.all([loadProfile(), delay]);
      if (cancelled) return;

      navigation.replace(profile ? "Dashboard" : "Start");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <View style={styles.lines}>
          <View style={[styles.line, { width: 22 }]} />
          <View style={[styles.line, { width: 16 }]} />
          <View style={[styles.line, { width: 19 }]} />
        </View>
      </View>
      <Text style={styles.title}>{t("appName")}</Text>
      <Text style={styles.subtitle}>{t("appNameEn")}</Text>
      <Text style={styles.slogan}>{t("slogan")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  lines: { gap: 8 },
  line: { height: 3, borderRadius: 3, backgroundColor: "white" },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  subtitle: { marginTop: 2, fontSize: 14, color: Colors.mutedText },
  slogan: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
});

