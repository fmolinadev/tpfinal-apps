import { useCallback, useEffect, useState } from "react";
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
import { apiGet, apiPost } from "@/servicios/api";
import { actualizarPrecio } from "@/servicios/admin-precios";
import { crearBloqueo } from "@/servicios/admin-bloqueos";

type TurnoAgenda = {
  id: string;
  espacioId: string;
  fecha: string;
  inicio: string;
  fin: string;
  estado: "libre" | "reservado" | "fijo" | "mantenimiento";
  reservaId: string | null;
  motivoBloqueo: string | null;
  precio: number;
};

type RespuestaLista<T> = {
  datos: T[];
  meta: {
    total: number;
    pagina: number;
    porPagina: number;
  };
};

function claveFecha(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AgendaAdminScreen() {
  const [turnosDelDia, setTurnosDelDia] = useState<TurnoAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [turnoSeleccionado, setTurnoSeleccionado] =
    useState<TurnoAgenda | null>(null);

  const [modal, setModal] = useState<"precio" | "bloqueo" | null>(null);
  const [precio, setPrecio] = useState("");
  const [motivo, setMotivo] = useState("");

  const hoy = claveFecha(new Date());

  const cargarAgenda = useCallback(async () => {
    setLoading(true);

    try {
      const respuesta = await apiGet<RespuestaLista<TurnoAgenda>>(
        `/agenda?fecha=${hoy}&porPagina=500`,
      );

      const ordenados = [...respuesta.datos].sort((a, b) =>
        a.inicio.localeCompare(b.inicio),
      );

      setTurnosDelDia(ordenados);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la agenda.",
      );
    } finally {
      setLoading(false);
    }
  }, [hoy]);

  useEffect(() => {
    void cargarAgenda();
  }, [cargarAgenda]);

  async function cambiarPrecio() {
    if (!turnoSeleccionado) return;

    const nuevoPrecio = Number(precio.replace(",", "."));

    if (!Number.isInteger(nuevoPrecio) || nuevoPrecio < 1) {
      setMensaje("Ingresá un precio entero mayor que cero.");
      return;
    }

    setProcesando(true);

    try {
      const respuesta = await actualizarPrecio(
        turnoSeleccionado.espacioId,
        nuevoPrecio,
      );

      if (!respuesta.ok) {
        setMensaje(respuesta.mensaje);
        return;
      }

      setMensaje(respuesta.mensaje);
      setModal(null);
      await cargarAgenda();
    } finally {
      setProcesando(false);
    }
  }

  async function bloquear() {
    if (!turnoSeleccionado || !motivo.trim()) {
      setMensaje("Ingresá un motivo para bloquear el turno.");
      return;
    }

    setProcesando(true);

    try {
      await crearBloqueo({
        espacioIds: [turnoSeleccionado.espacioId],
        fecha: turnoSeleccionado.fecha,
        inicio: turnoSeleccionado.inicio,
        fin: turnoSeleccionado.fin,
        motivo: motivo.trim(),
      });

      setMensaje("El turno fue bloqueado correctamente.");
      setModal(null);
      await cargarAgenda();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo bloquear el turno.",
      );
    } finally {
      setProcesando(false);
    }
  }

  async function marcarAusente(reservaId: string) {
    setProcesando(true);

    try {
      await apiPost(`/reservas/${reservaId}/ausente`);

      setMensaje("La ausencia fue registrada correctamente.");
      await cargarAgenda();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la ausencia.",
      );
    } finally {
      setProcesando(false);
    }
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

          {mensaje && (
            <Text style={styles.message}>{mensaje}</Text>
          )}

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator
                size="large"
                color={Colors.light.backgroundSelected}
              />
              <Text style={styles.bodyText}>Cargando agenda...</Text>
            </View>
          ) : turnosDelDia.length === 0 ? (
            <Text style={styles.bodyText}>
              No hay turnos cargados para hoy.
            </Text>
          ) : (
            turnosDelDia.map((turno) => (
              <View key={turno.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  Espacio: {turno.espacioId}
                </Text>

                <Text style={styles.cardTime}>
                  {turno.inicio} - {turno.fin}
                </Text>

                <Text style={styles.cardStatus}>
                  Estado: {turno.estado.toUpperCase()}
                </Text>

                <Text style={styles.cardText}>
                  Precio: $ {turno.precio.toLocaleString("es-AR")}
                </Text>

                {turno.motivoBloqueo && (
                  <Text style={styles.cardText}>
                    Motivo del bloqueo: {turno.motivoBloqueo}
                  </Text>
                )}

                {turno.reservaId && (
                  <View style={styles.actionGroup}>
                    <Text style={styles.cardText}>
                      Reserva: {turno.reservaId}
                    </Text>

                    <Pressable
                      style={styles.actionButton}
                      disabled={procesando}
                      onPress={() => void marcarAusente(turno.reservaId!)}
                    >
                      <Text style={styles.actionText}>
                        [ Registrar ausencia ]
                      </Text>
                    </Pressable>

                    <Text style={styles.helperText}>
                      El ingreso como presente se registra mediante el
                      escaneo del código QR.
                    </Text>
                  </View>
                )}

                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => {
                      setTurnoSeleccionado(turno);
                      setPrecio(String(turno.precio));
                      setMensaje(null);
                      setModal("precio");
                    }}
                  >
                    <Text style={styles.actionText}>
                      [ Cambiar precio ]
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.actionButton}
                    disabled={turno.estado === "mantenimiento"}
                    onPress={() => {
                      setTurnoSeleccionado(turno);
                      setMotivo("");
                      setMensaje(null);
                      setModal("bloqueo");
                    }}
                  >
                    <Text style={styles.actionText}>
                      [ Bloquear turno ]
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
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
                {modal === "precio"
                  ? "Cambiar precio"
                  : "Bloquear turno"}
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
                disabled={procesando}
                onPress={() =>
                  void (modal === "precio" ? cambiarPrecio() : bloquear())
                }
              >
                {procesando ? (
                  <ActivityIndicator color={Colors.light.background} />
                ) : (
                  <Text style={styles.confirmText}>[ Confirmar ]</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                disabled={procesando}
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
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
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