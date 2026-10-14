import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import {
    simularNotificacionPush,
    solicitarPermisosNotificaciones,
} from "@/servicios/notificaciones";

export default function PerfilScreen() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  async function solicitarPermisos() {
    setProcesando(true);
    try {
      const permitido = await solicitarPermisosNotificaciones();
      setMensaje(
        permitido
          ? "Permisos de notificación habilitados."
          : "Permisos de notificación rechazados.",
      );
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudieron solicitar los permisos.",
      );
    } finally {
      setProcesando(false);
    }
  }

  async function probarNotificacion(titulo: string, cuerpo: string) {
    setProcesando(true);
    try {
      const identificador = await simularNotificacionPush(titulo, cuerpo);
      setMensaje(
        identificador
          ? "Aviso de prueba programado."
          : "No se pudo programar el aviso. Revisá los permisos.",
      );
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo programar el aviso de prueba.",
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Perfil y configuración</Text>
      <Text style={styles.subtitle}>Notificaciones</Text>
      <Text style={styles.text}>
        Activá los avisos para recibir recordatorios de tus reservas y novedades
        del complejo.
      </Text>

      <Pressable
        style={[styles.primaryButton, procesando && styles.disabledButton]}
        disabled={procesando}
        onPress={() => void solicitarPermisos()}
      >
        <Text style={styles.primaryButtonText}>
          {procesando
            ? "Procesando..."
            : "[ Solicitar Permisos de Notificación ]"}
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Avisos de prueba</Text>
      <Pressable
        style={[styles.secondaryButton, procesando && styles.disabledButton]}
        disabled={procesando}
        onPress={() =>
          void probarNotificacion(
            "Aviso del complejo",
            "Tu turno de hoy a las 19:00 fue cancelado por lluvia.",
          )
        }
      >
        <Text style={styles.secondaryButtonText}>
          [ Probar aviso de lluvia ]
        </Text>
      </Pressable>
      <Pressable
        style={[styles.secondaryButton, procesando && styles.disabledButton]}
        disabled={procesando}
        onPress={() =>
          void probarNotificacion(
            "Aviso de favoritos",
            "¡Se liberó un turno en Cancha 2 a las 20:00!",
          )
        }
      >
        <Text style={styles.secondaryButtonText}>
          [ Probar aviso de favorito ]
        </Text>
      </Pressable>

      {mensaje && <Text style={styles.message}>{mensaje}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1120" },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 22,
  },
  subtitle: {
    color: "#d9f99d",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 8,
  },
  text: { color: "#dbe7f5", fontSize: 16, lineHeight: 25, marginBottom: 20 },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 28,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#d9f99d",
    padding: 17,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#172238",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "#172238",
    borderWidth: 1,
    borderColor: "#8fa2bc",
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  disabledButton: { opacity: 0.5 },
  message: {
    color: "#fef08a",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 24,
    marginTop: 20,
  },
});
