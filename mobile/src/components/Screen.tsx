import React from "react";
import { SafeAreaView, StyleSheet, View, ViewStyle } from "react-native";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";

export function Screen(props: {
  children: React.ReactNode;
  padded?: boolean;
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView style={[styles.safe, props.style]}>
      <View style={[styles.body, props.padded !== false && styles.padded]}>{props.children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1 },
  padded: { padding: Spacing.lg },
});

