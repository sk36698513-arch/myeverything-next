import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";

export function PrimaryButton(props: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  size?: "md" | "sm";
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "md";
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
        size === "sm" ? styles.btnSm : null,
        { backgroundColor: bg, opacity: props.disabled ? 0.5 : pressed ? 0.9 : 1 },
        props.style,
      ]}
    >
      <Text style={[styles.text, size === "sm" ? styles.textSm : null]}>{props.title}</Text>
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
  btnSm: {
    paddingVertical: 9,
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
  },
  text: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 13,
  },
});

