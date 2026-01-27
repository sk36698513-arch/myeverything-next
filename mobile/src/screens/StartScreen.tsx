import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { RootStackParamList } from "../navigation/types";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";
import { loadProfile, saveProfile } from "../storage/profile";
import { useI18n } from "../i18n/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Start">;

export function StartScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    (async () => {
      const existing = await loadProfile();
      if (existing) navigation.replace("Dashboard");
      setLoading(false);
    })();
  }, [navigation]);

  if (loading)
    return (
      <Screen padded>
        <View />
      </Screen>
    );

  async function start(isAnonymous: boolean) {
    if (!isAnonymous) {
      const trimmed = email.trim();
      if (!trimmed) {
        Alert.alert(t("pleaseEnterEmailTitle"), t("pleaseEnterEmailBody"));
        return;
      }
    }

    await saveProfile({
      email: isAnonymous ? undefined : email.trim(),
      isAnonymous,
      createdAtISO: new Date().toISOString(),
    });
    navigation.replace("Dashboard");
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t("startTitle")}</Text>
        <Text style={styles.notice}>{t("startPrivateNotice")}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t("emailOptional")}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t("emailPlaceholder")}
          placeholderTextColor="#8AA4B8"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <View style={{ height: Spacing.md }} />
        <PrimaryButton title={t("startWithEmail")} onPress={() => start(false)} />
        <View style={{ height: Spacing.sm }} />
        <PrimaryButton title={t("startAnonymously")} variant="secondary" onPress={() => start(true)} />
      </View>

      <Text style={styles.footer}>
        {t("privacyFooter")}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: Spacing.xl, paddingHorizontal: Spacing.lg },
  title: { fontSize: 26, fontWeight: "800", color: Colors.primary },
  notice: { marginTop: 6, fontSize: 14, color: Colors.mutedText },
  card: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: { fontSize: 13, color: Colors.mutedText, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: "#FAFCFF",
  },
  footer: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.mutedText,
  },
});

