import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Fonts } from "@/constants/theme";
import {
  useTheme,
  useThemePreference,
  useThemeStyles,
  type ThemePreference,
} from "@/hooks/use-theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Dispositivo" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

export function ThemePreferenceControl() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const { preference, setPreference } = useThemePreference();
  const [saving, setSaving] = useState(false);

  async function seleccionarTema(nextPreference: ThemePreference) {
    if (saving || nextPreference === preference) return;
    setSaving(true);
    try {
      await setPreference(nextPreference);
    } catch (error) {
      Alert.alert(
        "No se pudo cambiar el tema",
        error instanceof Error ? error.message : "Volvé a intentarlo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Apariencia</Text>
      <Text style={styles.description}>
        Elegí cómo querés ver la aplicación.
      </Text>
      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const selected = preference === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: saving }}
              disabled={saving}
              onPress={() => void seleccionarTema(option.value)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.background,
      borderColor: palette.backgroundElement,
      borderRadius: 16,
      borderWidth: 1,
      gap: 10,
      padding: 18,
    },
    title: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 18,
      fontWeight: "800",
    },
    description: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 14,
      lineHeight: 20,
    },
    options: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 2,
    },
    option: {
      borderColor: palette.backgroundSelected,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },
    optionSelected: { backgroundColor: palette.backgroundSelected },
    optionText: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 14,
      fontWeight: "700",
    },
    optionTextSelected: { color: palette.textOnSelected },
  });
}
