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
  onSelect: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
} & (
  | { multiple?: false; selectedId: string }
  | { multiple: true; selectedIds: string[] }
);

export function SpaceSelect(props: SpaceSelectProps) {
  const { spaces, onSelect, disabled = false, placeholder = "Seleccioná un espacio" } = props;
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const [visible, setVisible] = useState(false);
  const selectedSpaces = spaces.filter((space) =>
    props.multiple ? props.selectedIds.includes(space.id) : space.id === props.selectedId,
  );
  const selectionLabel = selectedSpaces.length > 1
    ? `${selectedSpaces.length} espacios seleccionados`
    : selectedSpaces[0]?.nombre ?? placeholder;

  function elegirEspacio(id: string) {
    onSelect(id);
    if (!props.multiple) setVisible(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={selectionLabel}
        accessibilityState={{ disabled, expanded: visible }}
        disabled={disabled}
        onPress={() => setVisible(true)}
        style={[styles.select, disabled && styles.disabled]}
      >
        <Text
          style={[
            styles.selectText,
            selectedSpaces.length === 0 && styles.placeholder,
          ]}
        >
          {selectionLabel}
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
              {spaces.map((space) => {
                const selected = props.multiple
                  ? props.selectedIds.includes(space.id)
                  : space.id === props.selectedId;
                return (
                  <Pressable
                    accessibilityRole={props.multiple ? "checkbox" : "button"}
                    accessibilityState={props.multiple ? { checked: selected } : { selected }}
                    key={space.id}
                    onPress={() => elegirEspacio(space.id)}
                    style={[
                      styles.option,
                      selected && styles.optionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {space.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {props.multiple ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setVisible(false)}
                style={styles.done}
              >
                <Text style={styles.doneText}>Listo</Text>
              </Pressable>
            ) : null}
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
    done: {
      alignItems: "center",
      padding: 12,
      borderRadius: 10,
      backgroundColor: palette.backgroundSelected,
    },
    doneText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
  });
}
