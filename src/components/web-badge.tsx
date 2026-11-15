import { version } from "expo/package.json";
import { StyleSheet } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function WebBadge() {
  const palette = useTheme();

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
          { backgroundColor: palette.backgroundElement },
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
