import React from "react";
import { Platform, SafeAreaView, StyleSheet, View, ViewStyle } from "react-native";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";

const WEB_MAX_WIDTH = 420;

export function Screen(props: {
  children: React.ReactNode;
  padded?: boolean;
  style?: ViewStyle;
}) {
  const isWeb = Platform.OS === "web";
  return (
    <SafeAreaView style={[styles.safe, isWeb && styles.safeWeb, props.style]}>
      <View style={[styles.body, isWeb && styles.bodyWeb, props.padded !== false && styles.padded]}>
        {props.children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  // 웹(데스크톱)에서는 "휴대폰 폭"으로 가운데 정렬해 보이도록 함
  safeWeb: { alignItems: "center" },
  body: { flex: 1 },
  bodyWeb: { width: "100%", maxWidth: WEB_MAX_WIDTH },
  padded: { padding: Spacing.lg },
});

