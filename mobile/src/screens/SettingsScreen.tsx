import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { RootStackParamList } from "../navigation/types";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";
import { clearAll } from "../storage/storage";
import { useI18n } from "../i18n/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export function SettingsScreen({ navigation }: Props) {
  const { t } = useI18n();
  async function confirmDelete() {
    Alert.alert(
      t("deleteConfirmTitle"),
      t("deleteConfirmBody"),
      [
        { text: t("deleteCancel"), style: "cancel" },
        {
          text: t("deleteDo"),
          style: "destructive",
          onPress: async () => {
            await clearAll();
            navigation.reset({ index: 0, routes: [{ name: "Splash" }] });
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t("settingsTitle")}</Text>
        <Text style={styles.subtitle}>{t("privacySectionTitle")}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("privacySectionTitle")}</Text>
        <Text style={styles.sectionBody}>{t("privacySectionBody")}</Text>

        <View style={{ height: Spacing.lg }} />
        <PrimaryButton title={t("deleteAllData")} variant="danger" onPress={confirmDelete} />
        <View style={{ height: Spacing.sm }} />
        <PrimaryButton
          title={t("goDashboard")}
          variant="secondary"
          onPress={() => navigation.navigate("Dashboard")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: Spacing.xl },
  title: { fontSize: 26, fontWeight: "900", color: Colors.primary },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 18, color: Colors.mutedText },
  card: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: Colors.text },
  sectionBody: { marginTop: 10, fontSize: 13, lineHeight: 19, color: Colors.mutedText },
});

