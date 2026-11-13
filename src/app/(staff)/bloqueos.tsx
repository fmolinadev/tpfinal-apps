import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SpaceSelect } from "@/components/space-select";
import { Colors, Fonts } from "@/constants/theme";
import { crearBloqueo } from "@/servicios/admin-bloqueos";
import { getEspacios } from "@/servicios/espacios";
import type { Espacio } from "@/tipos";

function fechaLocal(): string {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function esHoraValida(hora: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}

export default function BloqueosScreen() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioId, setEspacioId] = useState("");
  const [fecha, setFecha] = useState(fechaLocal());
  const [inicio, setInicio] = useState("09:00");
  const [fin, setFin] = useState("10:00");
  const [diaCompleto, setDiaCompleto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargandoEspacios, setCargandoEspacios] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activa = true;
      setEspacios([]);
      setEspacioId("");
      setFecha(fechaLocal());
      setInicio("09:00");
      setFin("10:00");
      setDiaCompleto(false);
      setMotivo("");
      setMensaje(null);
      setCargandoEspacios(true);

      async function cargarEspacios() {
        try {
          const respuesta = await getEspacios();
          if (!activa) return;

          if ("error" in respuesta) {
            throw new Error(
              respuesta.error?.mensaje ?? "No se pudieron cargar los espacios.",
            );
          }

          setEspacios(respuesta.datos);
        } catch (error) {
          if (activa) {
            setMensaje(
              error instanceof Error
                ? error.message
                : "No se pudieron cargar los espacios.",
            );
          }
        } finally {
          if (activa) setCargandoEspacios(false);
        }
      }

      void cargarEspacios();

      return () => {
        activa = false;
      };
    }, []),
  );

  async function confirmarBloqueo() {
    setMensaje(null);

    const motivoFinal = motivo.trim();

    if (!espacioId) {
      setMensaje("Seleccioná un espacio.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      setMensaje("Ingresá una fecha válida con el formato AAAA-MM-DD.");
      return;
    }

    const [anio, mes, dia] = fecha.split("-").map(Number);
    const fechaIngresada = new Date(anio, mes - 1, dia);
    if (
      fechaIngresada.getFullYear() !== anio ||
      fechaIngresada.getMonth() !== mes - 1 ||
      fechaIngresada.getDate() !== dia
    ) {
      setMensaje("La fecha ingresada no es válida.");
      return;
    }

    if (
      !diaCompleto &&
      (!esHoraValida(inicio) || !esHoraValida(fin) || inicio >= fin)
    ) {
      setMensaje(
        "Ingresá un horario válido. El fin debe ser posterior al inicio.",
      );
      return;
    }

    if (!motivoFinal) {
      setMensaje("Ingresá el motivo del bloqueo.");
      return;
    }

    try {
      setGuardando(true);

      await crearBloqueo({
        espacioIds: [espacioId],
        fecha,
        ...(diaCompleto ? {} : { inicio, fin }),
        motivo: motivoFinal,
      });

      setMensaje("Bloqueo registrado correctamente.");
      setMotivo("");
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el bloqueo.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>OPERACIONES</Text>
      <Text style={styles.title}>Bloquear horario</Text>
      <Text style={styles.subtitle}>
        Registrá un bloqueo por mantenimiento o necesidad operativa.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Espacio</Text>
        <SpaceSelect
          spaces={espacios}
          selectedId={espacioId}
          onSelect={setEspacioId}
          disabled={cargandoEspacios || espacios.length === 0}
          placeholder={
            cargandoEspacios ? "Cargando espacios..." : "Seleccioná un espacio"
          }
        />

        {espacioId ? (
          <>
            <Text style={styles.label}>Fecha</Text>
            <TextInput
              value={fecha}
              onChangeText={setFecha}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={Colors.light.textSecondary}
              style={styles.input}
            />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: diaCompleto }}
              style={[styles.dayOption, diaCompleto && styles.dayOptionSelected]}
              onPress={() => setDiaCompleto((actual) => !actual)}
            >
              <Text
                style={[
                  styles.dayOptionText,
                  diaCompleto && styles.dayOptionTextSelected,
                ]}
              >
                {diaCompleto
                  ? "✓ Bloquear el día completo"
                  : "Bloquear el día completo"}
              </Text>
            </Pressable>

            {!diaCompleto ? (
              <>
                <Text style={styles.label}>Hora de inicio</Text>
                <TextInput
                  value={inicio}
                  onChangeText={setInicio}
                  placeholder="09:00"
                  placeholderTextColor={Colors.light.textSecondary}
                  style={styles.input}
                />
                <Text style={styles.label}>Hora de finalización</Text>
                <TextInput
                  value={fin}
                  onChangeText={setFin}
                  placeholder="10:00"
                  placeholderTextColor={Colors.light.textSecondary}
                  style={styles.input}
                />
              </>
            ) : null}

            <Text style={styles.label}>Motivo</Text>
            <TextInput
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Ej. mantenimiento"
              placeholderTextColor={Colors.light.textSecondary}
              style={styles.input}
            />

            <Text style={styles.helper}>
              Podés bloquear un horario o el día completo para el espacio
              seleccionado.
            </Text>

            <Pressable
              accessibilityRole="button"
              style={[styles.button, guardando && styles.buttonDisabled]}
              onPress={() => void confirmarBloqueo()}
              disabled={guardando}
            >
              <Text style={styles.buttonText}>
                {guardando ? "Registrando..." : "Confirmar bloqueo"}
              </Text>
            </Pressable>
          </>
        ) : null}

        {mensaje ? <Text style={styles.message}>{mensaje}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  eyebrow: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.3,
    fontFamily: Fonts.sans,
  },
  title: {
    color: Colors.light.text,
    fontSize: 30,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  subtitle: {
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    gap: 8,
  },
  label: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 5,
    fontFamily: Fonts.sans,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    padding: 12,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    fontFamily: Fonts.sans,
  },
  dayOption: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    borderRadius: 10,
    padding: 12,
  },
  dayOptionSelected: {
    backgroundColor: Colors.light.backgroundSelected,
    borderColor: Colors.light.backgroundSelected,
  },
  dayOptionText: {
    color: Colors.light.text,
    fontFamily: Fonts.sans,
  },
  dayOptionTextSelected: {
    color: Colors.light.background,
    fontWeight: "800",
  },
  helper: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.sans,
  },
  button: {
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.light.background,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  message: {
    color: Colors.light.textSecondary,
    fontWeight: "700",
    marginTop: 6,
    fontFamily: Fonts.sans,
  },
});
