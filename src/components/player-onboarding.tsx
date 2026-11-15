import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  RoleTabIcon,
  type RoleTabIconName,
} from "@/components/ui/role-tab-icon";
import { Fonts } from "@/constants/theme";
import { useTheme, type ThemePalette } from "@/hooks/use-theme";
import {
  hasSeenPlayerOnboarding,
  markPlayerOnboardingSeen,
} from "@/persistencia/onboarding";
import { getCurrentUserSession } from "@/persistencia/session";

const STEPS: {
  icon: RoleTabIconName;
  title: string;
  description: string;
}[] = [
  {
    icon: "courts",
    title: "Elegí un espacio",
    description:
      "Explorá las canchas desde Espacios o buscá directamente un horario disponible.",
  },
  {
    icon: "calendar",
    title: "Buscá día y horario",
    description:
      "Consultá los próximos siete días. La grilla distingue turnos libres, reservados y en mantenimiento.",
  },
  {
    icon: "recurring",
    title: "Confirmá tu reserva",
    description:
      "Elegí un turno libre que todavía no haya comenzado, indicá cuántos jugadores van y confirmá.",
  },
  {
    icon: "scan",
    title: "Tené tu QR a mano",
    description:
      "En Mis reservas podés consultar tus turnos y abrir el código QR de cada reserva.",
  },
];

export function PlayerOnboarding() {
  const palette = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [pasoActual, setPasoActual] = useState(0);
  const [visible, setVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargarOnboarding() {
        let idUsuarioJugador: string | null = null;

        try {
          const usuario = await getCurrentUserSession();
          if (!activo) return;

          if (usuario?.rol !== "jugador" || !usuario.id) {
            setUsuarioId(null);
            setVisible(false);
            return;
          }

          idUsuarioJugador = usuario.id;
          const yaVisto = await hasSeenPlayerOnboarding(usuario.id);
          if (!activo) return;

          setUsuarioId(usuario.id);
          setPasoActual(0);
          setVisible(!yaVisto);
        } catch (error) {
          if (activo) {
            if (idUsuarioJugador) {
              setUsuarioId(idUsuarioJugador);
              setPasoActual(0);
              setVisible(true);
            }
            Alert.alert(
              "No se pudo cargar la guía",
              error instanceof Error
                ? error.message
                : "No se pudo verificar si ya viste el onboarding.",
            );
          }
        }
      }

      void cargarOnboarding();

      return () => {
        activo = false;
      };
    }, []),
  );

  async function finalizarOnboarding() {
    if (guardando) return;

    setGuardando(true);
    try {
      if (usuarioId) {
        await markPlayerOnboardingSeen(usuarioId);
      }
      setVisible(false);
    } catch (error) {
      Alert.alert(
        "No se pudo guardar la guía",
        error instanceof Error
          ? error.message
          : "Es posible que vuelva a aparecer la próxima vez que inicies sesión.",
      );
      setVisible(false);
    } finally {
      setGuardando(false);
    }
  }

  function avanzar() {
    if (pasoActual === STEPS.length - 1) {
      void finalizarOnboarding();
      return;
    }
    setPasoActual((paso) => paso + 1);
  }

  const paso = STEPS[pasoActual];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => void finalizarOnboarding()}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>GUÍA RÁPIDA</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Omitir guía"
              disabled={guardando}
              onPress={() => void finalizarOnboarding()}
              hitSlop={12}
            >
              <Text style={styles.skipText}>Omitir</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <RoleTabIcon
                name={paso.icon}
                color={palette.backgroundSelected}
                size={36}
                focused
              />
            </View>

            <Text style={styles.stepLabel}>
              PASO {pasoActual + 1} DE {STEPS.length}
            </Text>
            <Text style={styles.title}>{paso.title}</Text>
            <Text style={styles.description}>{paso.description}</Text>

            <View
              style={styles.progress}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Paso ${pasoActual + 1} de ${STEPS.length}`}
              accessibilityValue={{
                min: 1,
                max: STEPS.length,
                now: pasoActual + 1,
              }}
            >
              {STEPS.map((item, index) => (
                <View
                  key={item.title}
                  style={[
                    styles.progressDot,
                    index === pasoActual && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.actions}>
              {pasoActual > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={guardando}
                  onPress={() => setPasoActual((paso) => paso - 1)}
                  style={styles.backButton}
                >
                  <Text style={styles.backButtonText}>Anterior</Text>
                </Pressable>
              ) : (
                <View style={styles.backButtonPlaceholder} />
              )}

              <Pressable
                accessibilityRole="button"
                disabled={guardando}
                onPress={avanzar}
                style={styles.nextButton}
              >
                <Text style={styles.nextButtonText}>
                  {pasoActual === STEPS.length - 1 ? "Comenzar" : "Siguiente"}
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: "rgba(12, 12, 18, 0.72)",
    },
    safeArea: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    header: {
      width: "100%",
      maxWidth: 460,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    eyebrow: {
      color: "#FFFFFF",
      fontFamily: Fonts.sans,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.5,
    },
    skipText: {
      color: "#FFFFFF",
      fontFamily: Fonts.sans,
      fontSize: 14,
      fontWeight: "700",
      padding: 8,
    },
    card: {
      width: "100%",
      maxWidth: 460,
      alignSelf: "center",
      alignItems: "center",
      backgroundColor: palette.background,
      borderRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 22,
    },
    iconCircle: {
      width: 76,
      height: 76,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 24,
      backgroundColor: palette.backgroundElement,
      marginBottom: 22,
    },
    stepLabel: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.3,
      marginBottom: 8,
    },
    title: {
      color: palette.text,
      fontFamily: Fonts.sans,
      fontSize: 26,
      fontWeight: "900",
      lineHeight: 32,
      textAlign: "center",
      marginBottom: 10,
    },
    description: {
      minHeight: 72,
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 15,
      lineHeight: 23,
      textAlign: "center",
    },
    progress: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 24,
      marginBottom: 22,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.backgroundElement,
    },
    progressDotActive: {
      width: 24,
      backgroundColor: palette.backgroundSelected,
    },
    actions: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    backButton: {
      minWidth: 112,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.backgroundElement,
      paddingHorizontal: 14,
    },
    backButtonPlaceholder: { minWidth: 112, minHeight: 48 },
    backButtonText: {
      color: palette.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 14,
      fontWeight: "800",
    },
    nextButton: {
      minWidth: 132,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: palette.backgroundSelected,
      paddingHorizontal: 18,
    },
    nextButtonText: {
      color: "#FFFFFF",
      fontFamily: Fonts.sans,
      fontSize: 14,
      fontWeight: "900",
    },
  });
}
