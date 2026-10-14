import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { AuthGuard } from "@/components/auth-guard";
import { Colors, Fonts } from "@/constants/theme";
import { espacios, reservas, turnos } from "@/mocks";
import {
    actualizarPrecio,
    bloquearTurno,
    marcarAsistencia,
} from "@/servicios/admin";
import type { Reserva, Turno } from "@/tipos";
import { useRouter } from "expo-router";

function claveFecha(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatearHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function nombreEspacio(espacioId: string): string {
  return espacios.find((item) => item.id === espacioId)?.nombre ?? espacioId;
}

function reservaParaTurno(turno: Turno): Reserva | undefined {
  return reservas.find(
    (reserva) =>
      reserva.espacioId === turno.espacioId &&
      new Date(reserva.fechaHoraInicio).getTime() ===
        new Date(turno.fechaHoraInicio).getTime(),
  );
}

export default function AgendaAdminScreen() {
  const router = useRouter();
  const [turnosDelDia, setTurnosDelDia] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(
    null,
  );
  const [modal, setModal] = useState<"precio" | "bloqueo" | null>(null);
  const [precio, setPrecio] = useState("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    const hoy = claveFecha(new Date());
    setTurnosDelDia(
      turnos
        .filter((turno) => claveFecha(new Date(turno.fechaHoraInicio)) === hoy)
        .sort(
          (a, b) =>
            new Date(a.fechaHoraInicio).getTime() -
            new Date(b.fechaHoraInicio).getTime(),
        ),
    );
    setLoading(false);
  }, []);

  const turnosOrdenados = useMemo(() => turnosDelDia, [turnosDelDia]);

  async function cambiarPrecio() {
    if (!turnoSeleccionado) return;
    const nuevoPrecio = Number(precio);
    const respuesta = await actualizarPrecio(
      turnoSeleccionado.espacioId,
      nuevoPrecio,
    );
    if ("error" in respuesta && respuesta.error) {
      setMensaje(respuesta.error.mensaje);
    } else {
      setTurnosDelDia((actuales) =>
        actuales.map((turno) =>
          turno.espacioId === turnoSeleccionado.espacioId &&
          turno.estado === "libre"
            ? { ...turno, precio: nuevoPrecio }
            : turno,
        ),
      );
      setMensaje("Precio actualizado.");
      setModal(null);
    }
  }

  async function bloquear() {
    if (!turnoSeleccionado || !motivo.trim()) {
      setMensaje("Ingresá un motivo para bloquear el turno.");
      return;
    }
    const respuesta = await bloquearTurno(
      turnoSeleccionado.espacioId,
      turnoSeleccionado.fechaHoraInicio,
      motivo.trim(),
    );
    if ("error" in respuesta && respuesta.error) {
      setMensaje(respuesta.error.mensaje);
    } else {
      setTurnosDelDia((actuales) =>
        actuales.map((turno) =>
          turno.id === turnoSeleccionado.id
            ? { ...turno, estado: "mantenimiento" }
            : turno,
        ),
      );
      setMensaje(`Turno bloqueado: ${motivo.trim()}`);
      setModal(null);
    }
  }

  async function asistencia(reserva: Reserva, estado: "presente" | "ausente") {
    const respuesta = await marcarAsistencia(reserva.id, estado);
    if ("error" in respuesta && respuesta.error) {
      setMensaje(respuesta.error.mensaje);
      return;
    }
    setMensaje(
      estado === "presente"
        ? "Asistencia marcada: Presente."
        : "Asistencia marcada: Ausente.",
    );
  }

  return (
    <AuthGuard allowedRoles={["administrador"]}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Agenda del día</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString("es-AR")}
          </Text>
          <Text style={styles.helperText}>
            Portal exclusivo del administrador.
          </Text>

          {mensaje && <Text style={styles.message}>{mensaje}</Text>}
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator
                size="large"
                color={Colors.light.backgroundSelected}
              />
              <Text style={styles.bodyText}>Cargando agenda...</Text>
            </View>
          ) : turnosOrdenados.length === 0 ? (
            <Text style={styles.bodyText}>
              No hay turnos cargados para hoy.
            </Text>
          ) : (
            turnosOrdenados.map((turno) => {
              const reserva = reservaParaTurno(turno);
              return (
                <View key={turno.id} style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {nombreEspacio(turno.espacioId)}
                  </Text>
                  <Text style={styles.cardTime}>
                    {formatearHora(turno.fechaHoraInicio)}
                  </Text>
                  <Text style={styles.cardStatus}>
                    Estado: {turno.estado.toUpperCase()}
                  </Text>
                  <Text style={styles.cardText}>
                    Precio: $ {turno.precio.toLocaleString("es-AR")}
                  </Text>

                  {reserva && (
                    <View style={styles.actionGroup}>
                      <Text style={styles.cardText}>Reserva: {reserva.id}</Text>
                      <View style={styles.actionRow}>
                        <Pressable
                          style={styles.actionButton}
                          onPress={() => void asistencia(reserva, "presente")}
                        >
                          <Text style={styles.actionText}>[ Presente ]</Text>
                        </Pressable>
                        <Pressable
                          style={styles.actionButton}
                          onPress={() => void asistencia(reserva, "ausente")}
                        >
                          <Text style={styles.actionText}>
                            [ No se presentó ]
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => {
                        setTurnoSeleccionado(turno);
                        setPrecio(String(turno.precio));
                        setModal("precio");
                      }}
                    >
                      <Text style={styles.actionText}>[ Cambiar Precio ]</Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => {
                        setTurnoSeleccionado(turno);
                        setMotivo("");
                        setModal("bloqueo");
                      }}
                    >
                      <Text style={styles.actionText}>
                        [ Bloquear Turno / Día ]
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <Modal
          visible={modal !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setModal(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {modal === "precio" ? "Cambiar precio" : "Bloquear turno / día"}
              </Text>
              {modal === "precio" ? (
                <TextInput
                  value={precio}
                  onChangeText={setPrecio}
                  keyboardType="numeric"
                  style={styles.input}
                  placeholder="Nuevo precio"
                  placeholderTextColor="#9aa8bb"
                />
              ) : (
                <TextInput
                  value={motivo}
                  onChangeText={setMotivo}
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Motivo: lluvia, mantenimiento..."
                  placeholderTextColor="#9aa8bb"
                  multiline
                />
              )}
              <Pressable
                style={styles.confirmButton}
                onPress={() =>
                  void (modal === "precio" ? cambiarPrecio() : bloquear())
                }
              >
                <Text style={styles.confirmText}>[ Confirmar ]</Text>
              </Pressable>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setModal(null)}
              >
                <Text style={styles.cancelText}>[ Cancelar ]</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundElement },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    color: Colors.light.text,
    fontSize: 30,
    fontWeight: "900",
    fontFamily: Fonts.sans,
  },
  dateText: {
    color: Colors.light.textSecondary,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 4,
    fontFamily: Fonts.sans,
  },
  helperText: {
    color: Colors.light.text,
    fontSize: 15,
    marginTop: 6,
    marginBottom: 18,
    fontFamily: Fonts.sans,
  },
  message: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
    fontFamily: Fonts.sans,
  },
  centered: { alignItems: "center", paddingVertical: 40 },
  bodyText: {
    color: Colors.light.text,
    fontSize: 16,
    marginTop: 10,
    fontFamily: Fonts.sans,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: Colors.light.text,
    fontSize: 21,
    fontWeight: "900",
    fontFamily: Fonts.sans,
  },
  cardTime: {
    color: Colors.light.textSecondary,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 6,
    fontFamily: Fonts.sans,
  },
  cardStatus: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
    fontFamily: Fonts.sans,
  },
  cardText: {
    color: Colors.light.text,
    fontSize: 15,
    marginTop: 6,
    fontFamily: Fonts.sans,
  },
  actionGroup: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundElement,
    marginTop: 12,
    paddingTop: 10,
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  actionButton: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
    borderRadius: 9,
    paddingVertical: 11,
    paddingHorizontal: 10,
  },
  actionText: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(59,55,58,0.55)",
  },
  modalCard: {
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: {
    color: Colors.light.text,
    fontSize: 23,
    fontWeight: "900",
    marginBottom: 14,
    fontFamily: Fonts.sans,
  },
  input: {
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 9,
    padding: 13,
    fontSize: 17,
    marginBottom: 14,
    fontFamily: Fonts.sans,
  },
  multilineInput: { minHeight: 90, textAlignVertical: "top" },
  confirmButton: {
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 9,
    padding: 15,
    alignItems: "center",
  },
  confirmText: {
    color: Colors.light.background,
    fontWeight: "900",
    fontFamily: Fonts.sans,
  },
  cancelButton: { padding: 15, alignItems: "center" },
  cancelText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
});
