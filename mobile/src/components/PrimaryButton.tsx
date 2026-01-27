import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";

export function PrimaryButton(props: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const variant = props.variant ?? "primary";
  const bg =
    variant === "danger"
      ? Colors.danger
      : variant === "secondary"
        ? Colors.primarySoft
        : Colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: props.disabled ? 0.5 : pressed ? 0.9 : 1 },
        props.style,
      ]}
    >
      <Text style={styles.text}>{props.title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

