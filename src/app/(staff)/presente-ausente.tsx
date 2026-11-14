
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import {
  listarReservasPorFecha,
  marcarReservaAusente,
  type ReservaAsistencia,
} from "@/servicios/reservas";

function nombreEstado(estado: string): string {
  const normalizado = estado.toLowerCase();

  switch (normalizado) {
    case "confirmada":
      return "Confirmada";
    case "cumplida":
      return "Presente";
    case "ausente":
      return "Ausente";
    case "cancelada":
      return "Cancelada";
    default:
      return estado;
  }
}

function fechaHoy(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

export default function PresenteAusenteScreen() {
  const [reservas, setReservas] = useState<ReservaAsistencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [reservaProcesando, setReservaProcesando] = useState<string | null>(
    null,
  );
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargarReservas = useCallback(async () => {
    try {
      setReservas(await listarReservasPorFecha(fechaHoy()));
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las reservas.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  function actualizarReservas() {
    setCargando(true);
    setMensaje(null);
    void cargarReservas();
  }

  useEffect(() => {
    let active = true;

    listarReservasPorFecha(fechaHoy())
      .then((datos) => {
        if (active) setReservas(datos);
      })
      .catch((error: unknown) => {
        if (active) {
          setMensaje(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las reservas.",
          );
        }
      })
      .finally(() => {
        if (active) setCargando(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function marcarAusente(reservaId: string) {
    try {
      setReservaProcesando(reservaId);
      setMensaje(null);

      await marcarReservaAusente(reservaId);

      setMensaje("La ausencia se registró correctamente.");
      await cargarReservas();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la ausencia.",
      );
    } finally {
      setReservaProcesando(null);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.eyebrow}>CONTROL DE ASISTENCIA</Text>

      <Text style={styles.title}>Presente / Ausente</Text>

      <Text style={styles.subtitle}>
        Consultá las reservas y registrá las ausencias. Los ingresos se
        registran mediante la validación del código QR.
      </Text>

      <Pressable
        style={styles.refreshButton}
        onPress={actualizarReservas}
        disabled={cargando}
      >
        <Text style={styles.refreshText}>
          {cargando ? "Actualizando..." : "Actualizar reservas"}
        </Text>
      </Pressable>

      {mensaje ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{mensaje}</Text>
        </View>
      ) : null}

      {cargando ? (
        <Text style={styles.info}>Cargando reservas...</Text>
      ) : reservas.length === 0 ? (
        <Text style={styles.info}>No hay reservas para mostrar.</Text>
      ) : (
        reservas.map((reserva) => {
          const confirmada =
            reserva.estado.toLowerCase() === "confirmada";

          const procesando = reservaProcesando === reserva.id;

          return (
            <View key={reserva.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                Reserva {reserva.id}
              </Text>

              <Text style={styles.detail}>
                Espacio: {reserva.espacioId}
              </Text>

              <Text style={styles.detail}>
                Personas: {reserva.cantidadPersonas}
              </Text>

              <Text style={styles.detail}>
                Estado: {nombreEstado(reserva.estado)}
              </Text>

              {reserva.ingresoEn ? (
                <Text style={styles.detail}>
                  Ingreso registrado:{" "}
                  {new Date(reserva.ingresoEn).toLocaleString("es-AR")}
                </Text>
              ) : null}

              {confirmada ? (
                <Pressable
                  style={[
                    styles.action,
                    procesando && styles.disabled,
                  ]}
                  disabled={procesando || reservaProcesando !== null}
                  onPress={() => void marcarAusente(reserva.id)}
                >
                  <Text style={styles.actionText}>
                    {procesando ? "Registrando..." : "Marcar ausente"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}
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
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  refreshButton: {
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
  },
  refreshText: {
    color: Colors.light.background,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  messageBox: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 5,
    borderLeftColor: Colors.light.textSecondary,
  },
  messageText: {
    color: Colors.light.text,
    fontWeight: "700",
    fontFamily: Fonts.sans,
  },
  info: {
    color: Colors.light.textSecondary,
    fontFamily: Fonts.sans,
    marginTop: 8,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    gap: 8,
  },
  cardTitle: {
    color: Colors.light.text,
    fontWeight: "800",
    fontSize: 17,
    fontFamily: Fonts.sans,
  },
  detail: {
    color: Colors.light.text,
    marginTop: 2,
    fontFamily: Fonts.sans,
  },
  action: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    padding: 11,
    alignItems: "center",
    marginTop: 6,
  },
  disabled: {
    opacity: 0.5,
  },
  actionText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
});