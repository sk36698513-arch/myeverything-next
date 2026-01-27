import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n/i18n";
import type { Locale } from "../i18n/translations";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";

const LOCALES: Locale[] = ["ko", "en", "ja"];

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();

  function label(l: Locale) {
    if (l === "ko") return t("langKo");
    if (l === "en") return t("langEn");
    return t("langJa");
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.caption}>{t("language")}</Text>
      <View style={styles.row}>
        {LOCALES.map((l) => {
          const selected = l === locale;
          return (
            <Pressable
              key={l}
              accessibilityRole="button"
              onPress={() => setLocale(l)}
              style={({ pressed }) => [
                styles.pill,
                selected ? styles.pillSelected : styles.pillUnselected,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.pillText, selected ? styles.pillTextSelected : styles.pillTextUnselected]}>
                {label(l)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.lg },
  caption: { fontSize: 12, color: Colors.mutedText, marginBottom: 8 },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  pillSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillUnselected: { backgroundColor: Colors.card, borderColor: Colors.border },
  pillText: { fontSize: 13, fontWeight: "800" },
  pillTextSelected: { color: "white" },
  pillTextUnselected: { color: Colors.primary },
});

