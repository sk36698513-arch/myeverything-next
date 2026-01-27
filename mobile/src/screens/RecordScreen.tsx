import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { RootStackParamList } from "../navigation/types";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";
import { addLog } from "../storage/logs";
import { useI18n } from "../i18n/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Record">;

export function RecordScreen({ navigation }: Props) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const { t } = useI18n();

  async function onSave() {
    if (saving) return;
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert(t("emptyLogTitle"), t("emptyLogBody"));
      return;
    }
    setSaving(true);
    try {
      const log = await addLog({ content: trimmed });
      setText("");
      navigation.replace("EmotionSummary", { logId: log.id });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("recordTitle")}</Text>
          <Text style={styles.subtitle}>{t("recordSubtitle")}</Text>
        </View>

        <View style={styles.card}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("recordPlaceholder")}
            placeholderTextColor="#8AA4B8"
            multiline
            style={styles.input}
            textAlignVertical="top"
          />
          <View style={{ height: Spacing.md }} />
          <PrimaryButton title={saving ? t("saving") : t("save")} onPress={onSave} />
          <View style={{ height: Spacing.sm }} />
          <PrimaryButton
            title={t("cancel")}
            variant="secondary"
            onPress={() => {
              if (saving) return;
              navigation.goBack();
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: Spacing.xl, paddingHorizontal: Spacing.lg },
  title: { fontSize: 26, fontWeight: "900", color: Colors.primary },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 18, color: Colors.mutedText },
  card: {
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
  },
  input: {
    flex: 1,
    minHeight: 180,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
    backgroundColor: "#FAFCFF",
  },
});

