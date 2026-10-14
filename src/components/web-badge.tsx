import { version } from "expo/package.json";
import { StyleSheet, useColorScheme } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { Spacing } from "@/constants/theme";

export function WebBadge() {
  const scheme = useColorScheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedText
        type="code"
        themeColor="textSecondary"
        style={styles.versionText}
      >
        v{version}
      </ThemedText>
      <ThemedView
        style={[
          styles.badgePlaceholder,
          { backgroundColor: scheme === "dark" ? "#1f2937" : "#e5e7eb" },
        ]}
      >
        <ThemedText type="smallBold" themeColor="text">
          Expo
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.five,
    alignItems: "center",
    gap: Spacing.two,
  },
  versionText: {
    textAlign: "center",
  },
  badgePlaceholder: {
    width: 123,
    height: 24,
    borderRadius: 12,

    alignItems: "center",
    justifyContent: "center",
  },
});
