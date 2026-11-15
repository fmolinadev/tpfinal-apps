import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";

type DateSelectorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
};

function fechaDesdeIso(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function fechaIso(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

export function DateSelector({
  label,
  value,
  onChange,
  minDate,
}: DateSelectorProps) {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const [visible, setVisible] = useState(false);
  const [mesVisible, setMesVisible] = useState(() => {
    const fecha = fechaDesdeIso(value);
    return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  });
  const seleccionada = fechaDesdeIso(value);
  const minimo = minDate ? fechaDesdeIso(minDate) : null;
  const diasDelMes = new Date(
    mesVisible.getFullYear(),
    mesVisible.getMonth() + 1,
    0,
  ).getDate();
  const espaciosAntes = new Date(
    mesVisible.getFullYear(),
    mesVisible.getMonth(),
    1,
  ).getDay();
  const nombreMes = mesVisible.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  function abrirCalendario() {
    setMesVisible(
      new Date(seleccionada.getFullYear(), seleccionada.getMonth(), 1),
    );
    setVisible(true);
  }

  function cambiarMes(cantidad: number) {
    setMesVisible(
      (actual) =>
        new Date(actual.getFullYear(), actual.getMonth() + cantidad, 1),
    );
  }

  function seleccionarDia(dia: number) {
    const fecha = new Date(
      mesVisible.getFullYear(),
      mesVisible.getMonth(),
      dia,
    );
    if (minimo && fechaIso(fecha) < fechaIso(minimo)) return;
    onChange(fechaIso(fecha));
    setVisible(false);
  }

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={abrirCalendario}
        style={styles.field}
      >
        <Text style={styles.fieldText}>
          {seleccionada.toLocaleDateString("es-AR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Text>
        <Text style={styles.fieldHint}>Elegir fecha</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.title}>{label}</Text>
            <View style={styles.monthHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mes anterior"
                onPress={() => cambiarMes(-1)}
                disabled={
                  Boolean(minimo) &&
                  mesVisible.getFullYear() === minimo?.getFullYear() &&
                  mesVisible.getMonth() === minimo?.getMonth()
                }
                style={styles.monthButton}
              >
                <Text style={styles.monthButtonText}>‹</Text>
              </Pressable>
              <Text style={styles.monthText}>{nombreMes}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mes siguiente"
                onPress={() => cambiarMes(1)}
                style={styles.monthButton}
              >
                <Text style={styles.monthButtonText}>›</Text>
              </Pressable>
            </View>
            <View style={styles.calendarGrid}>
              {["D", "L", "M", "M", "J", "V", "S"].map((dia, index) => (
                <Text key={`${dia}-${index}`} style={styles.weekday}>
                  {dia}
                </Text>
              ))}
              {Array.from({ length: espaciosAntes }, (_, index) => (
                <View key={`blank-${index}`} style={styles.dayCell} />
              ))}
              {Array.from({ length: diasDelMes }, (_, index) => {
                const dia = index + 1;
                const fecha = fechaIso(
                  new Date(
                    mesVisible.getFullYear(),
                    mesVisible.getMonth(),
                    dia,
                  ),
                );
                const seleccionadaActual =
                  dia === seleccionada.getDate() &&
                  mesVisible.getMonth() === seleccionada.getMonth() &&
                  mesVisible.getFullYear() === seleccionada.getFullYear();
                const deshabilitada = Boolean(
                  minimo && fecha < fechaIso(minimo),
                );

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={fecha}
                    accessibilityState={{
                      selected: seleccionadaActual,
                      disabled: deshabilitada,
                    }}
                    key={fecha}
                    disabled={deshabilitada}
                    onPress={() => seleccionarDia(dia)}
                    style={[
                      styles.dayCell,
                      seleccionadaActual && styles.daySelected,
                      deshabilitada && styles.dayDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        seleccionadaActual && styles.dayTextSelected,
                        deshabilitada && styles.dayTextDisabled,
                      ]}
                    >
                      {dia}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.cancelText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

type HourSelectorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minHour: number;
  maxHour: number;
};

export function HourSelector({
  label,
  value,
  onChange,
  minHour,
  maxHour,
}: HourSelectorProps) {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const [visible, setVisible] = useState(false);
  const opciones = Array.from(
    { length: maxHour - minHour + 1 },
    (_, index) => `${String(minHour + index).padStart(2, "0")}:00`,
  );

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={() => setVisible(true)}
        style={styles.field}
      >
        <Text style={styles.fieldText}>{value}</Text>
        <Text style={styles.fieldHint}>Elegir hora</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.title}>{label}</Text>
            <ScrollView style={styles.hourOptions}>
              {opciones.map((hora) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: hora === value }}
                  key={hora}
                  onPress={() => {
                    onChange(hora);
                    setVisible(false);
                  }}
                  style={[
                    styles.hourOption,
                    hora === value && styles.daySelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      hora === value && styles.dayTextSelected,
                    ]}
                  >
                    {hora}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.cancelText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    label: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      fontFamily: Fonts.sans,
    },
    field: {
      minHeight: 48,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 10,
      backgroundColor: palette.background,
    },
    fieldText: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    fieldHint: {
      color: palette.textSecondary,
      fontSize: 12,
      fontFamily: Fonts.sans,
    },
    overlay: {
      flex: 1,
      justifyContent: "center",
      padding: 20,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
    },
    dialog: {
      maxHeight: "85%",
      padding: 18,
      borderRadius: 16,
      backgroundColor: palette.background,
      gap: 14,
    },
    title: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "800",
      fontFamily: Fonts.sans,
      textTransform: "capitalize",
    },
    monthHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    monthButton: {
      minWidth: 42,
      minHeight: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: palette.backgroundElement,
    },
    monthButtonText: {
      color: palette.text,
      fontSize: 25,
      fontWeight: "800",
    },
    monthText: {
      color: palette.text,
      fontWeight: "800",
      textTransform: "capitalize",
      fontFamily: Fonts.sans,
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    weekday: {
      width: "14.2857%",
      height: 34,
      textAlign: "center",
      textAlignVertical: "center",
      color: palette.textSecondary,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    dayCell: {
      width: "14.2857%",
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
    },
    daySelected: {
      backgroundColor: palette.backgroundSelected,
    },
    dayDisabled: {
      opacity: 0.35,
    },
    dayText: {
      color: palette.text,
      fontFamily: Fonts.sans,
    },
    dayTextSelected: {
      color: palette.textOnSelected,
      fontWeight: "800",
    },
    dayTextDisabled: {
      color: palette.textSecondary,
    },
    hourOptions: {
      flexGrow: 0,
      maxHeight: 320,
    },
    hourOption: {
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
    },
    cancelButton: {
      alignItems: "center",
      padding: 10,
    },
    cancelText: {
      color: palette.textSecondary,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
  });
}
