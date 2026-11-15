import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";

import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import type { Espacio } from "@/tipos";

type SpaceSelectProps = {
  spaces: Pick<Espacio, "id" | "nombre">[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function SpaceSelect({
  spaces,
  selectedId,
  onSelect,
  disabled = false,
  placeholder = "Seleccioná un espacio",
}: SpaceSelectProps) {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const [visible, setVisible] = useState(false);
  const selectedSpace = spaces.find((space) => space.id === selectedId);

  function elegirEspacio(id: string) {
    onSelect(id);
    setVisible(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={selectedSpace?.nombre ?? placeholder}
        accessibilityState={{ disabled, expanded: visible }}
        disabled={disabled}
        onPress={() => setVisible(true)}
        style={[styles.select, disabled && styles.disabled]}
      >
        <Text
          style={[
            styles.selectText,
            !selectedSpace && styles.placeholder,
          ]}
        >
          {selectedSpace?.nombre ?? placeholder}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar selector de espacios"
          onPress={() => setVisible(false)}
          style={styles.overlay}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.dialog}
          >
            <Text style={styles.title}>Seleccioná un espacio</Text>
            <ScrollView
              style={styles.options}
              keyboardShouldPersistTaps="handled"
            >
              {spaces.map((space) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: space.id === selectedId }}
                  key={space.id}
                  onPress={() => elegirEspacio(space.id)}
                  style={[
                    styles.option,
                    space.id === selectedId && styles.optionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      space.id === selectedId && styles.optionTextSelected,
                    ]}
                  >
                    {space.nombre}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    select: {
      minHeight: 48,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 10,
      backgroundColor: palette.background,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    selectText: {
      flex: 1,
      color: palette.text,
      fontSize: 15,
      fontFamily: Fonts.sans,
    },
    placeholder: {
      color: palette.textSecondary,
    },
    chevron: {
      color: palette.textSecondary,
      fontSize: 12,
    },
    disabled: {
      opacity: 0.6,
    },
    overlay: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
    },
    dialog: {
      width: "100%",
      maxHeight: "75%",
      padding: 18,
      borderRadius: 16,
      backgroundColor: palette.background,
      gap: 12,
    },
    title: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    options: {
      flexGrow: 0,
    },
    option: {
      padding: 14,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
      borderRadius: 10,
      marginBottom: 8,
    },
    optionSelected: {
      backgroundColor: palette.backgroundSelected,
      borderColor: palette.backgroundSelected,
    },
    optionText: {
      color: palette.text,
      fontSize: 15,
      fontFamily: Fonts.sans,
    },
    optionTextSelected: {
      color: palette.textOnSelected,
      fontWeight: "800",
    },
  });
}
