import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { crearBloqueo } from "@/servicios/admin-bloqueos";

function fechaLocal(): string {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

export default function BloqueosScreen() {
  const [espacioId, setEspacioId] = useState("");
  const [fecha, setFecha] = useState(fechaLocal());
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function confirmarBloqueo() {
    setMensaje(null);

    const id = espacioId.trim();
    const motivoFinal = motivo.trim();

    if (!/^esp-[A-Za-z0-9_-]{1,36}$/.test(id)) {
      setMensaje("Ingresá un ID de espacio válido. Debe comenzar con esp-.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      setMensaje("Ingresá una fecha válida con el formato AAAA-MM-DD.");
      return;
    }

    const fechaIngresada = new Date(`${fecha}T00:00:00`);
    if (
      Number.isNaN(fechaIngresada.getTime()) ||
      fechaIngresada.toISOString().slice(0, 10) !== fecha
    ) {
      setMensaje("La fecha ingresada no es válida.");
      return;
    }

    if (!motivoFinal) {
      setMensaje("Ingresá el motivo del bloqueo.");
      return;
    }

    try {
      setCargando(true);

      await crearBloqueo({
        espacioIds: [id],
        fecha,
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
      setCargando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>OPERACIONES</Text>
      <Text style={styles.title}>Bloquear horario</Text>
      <Text style={styles.subtitle}>
        Registrá un bloqueo por mantenimiento o necesidad operativa.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>ID del espacio</Text>
        <TextInput
          value={espacioId}
          onChangeText={setEspacioId}
          placeholder="Ej. esp-1"
          placeholderTextColor={Colors.light.textSecondary}
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Fecha</Text>
        <TextInput
          value={fecha}
          onChangeText={setFecha}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={Colors.light.textSecondary}
          style={styles.input}
        />

        <Text style={styles.label}>Motivo</Text>
        <TextInput
          value={motivo}
          onChangeText={setMotivo}
          placeholder="Ej. mantenimiento"
          placeholderTextColor={Colors.light.textSecondary}
          style={styles.input}
        />

        <Text style={styles.helper}>
          Este bloqueo afecta a todo el día seleccionado para el espacio indicado.
        </Text>

        <Pressable
          style={[styles.button, cargando && styles.buttonDisabled]}
          onPress={() => void confirmarBloqueo()}
          disabled={cargando}
        >
          <Text style={styles.buttonText}>
            {cargando ? "Registrando..." : "Confirmar bloqueo"}
          </Text>
        </Pressable>

        {mensaje ? <Text style={styles.message}>{mensaje}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    padding: 20,
    justifyContent: "center",
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
    fontSize: 30,
    fontWeight: "800",
    color: Colors.light.text,
    fontFamily: Fonts.sans,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.text,
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
    fontFamily: Fonts.sans,
  },
  helper: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    marginTop: 4,
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