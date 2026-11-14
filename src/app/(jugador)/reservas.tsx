import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getCurrentUserSession } from "@/persistencia/session";
import {
  getMisReservas,
  guardarReservasEnCache,
  obtenerReservasDesdeCache,
} from "@/servicios/reservas";
import type { Reserva } from "@/tipos";

const DURACION_TURNO_MS = 60 * 60 * 1000;

function esProxima(reserva: Reserva): boolean {
  return (
    new Date(reserva.fechaHoraInicio).getTime() + DURACION_TURNO_MS > Date.now()
  );
}

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatearHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function ReservasScreen() {
  const router = useRouter();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [vista, setVista] = useState<"proximas" | "pasadas">("proximas");
  const [loading, setLoading] = useState(true);
  const [modoOffline, setModoOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarReservas = useCallback(async () => {
    setLoading(true);
    setError(null);
    setModoOffline(false);

    try {
      const usuario = await getCurrentUserSession();
      if (!usuario) {
        setError("No hay una sesión activa.");
        return;
      }

      try {
        const respuesta = await getMisReservas(usuario.id);
        if ("error" in respuesta && respuesta.error) {
          throw new Error(respuesta.error.mensaje);
        }

        setReservas(respuesta.datos);
        await guardarReservasEnCache(respuesta.datos, usuario.id);
      } catch {
        const reservasCacheadas = await obtenerReservasDesdeCache(usuario.id);
        if (reservasCacheadas === null) {
          throw new Error("No hay conexión ni reservas guardadas localmente.");
        }
        setReservas(reservasCacheadas);
        setModoOffline(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar tus reservas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargarReservas();
    }, [cargarReservas]),
  );

  const reservasFiltradas = reservas.filter((reserva) =>
    vista === "proximas" ? esProxima(reserva) : !esProxima(reserva),
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mis reservas</Text>
        {modoOffline && <Text style={styles.offline}>Modo sin conexión</Text>}

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, vista === "proximas" && styles.tabActivo]}
            onPress={() => setVista("proximas")}
          >
            <Text style={[styles.tabTexto, vista === "proximas" && styles.tabTextoActivo]}>
              Próximas
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, vista === "pasadas" && styles.tabActivo]}
            onPress={() => setVista("pasadas")}
          >
            <Text style={[styles.tabTexto, vista === "pasadas" && styles.tabTextoActivo]}>
              Pasadas
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.estado}>
            <ActivityIndicator size="large" color="#d9f99d" />
            <Text style={styles.textoEstado}>Cargando reservas...</Text>
          </View>
        ) : error ? (
          <View style={styles.estado}>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.botonSecundario} onPress={() => void cargarReservas()}>
              <Text style={styles.textoBoton}>Reintentar</Text>
            </Pressable>
          </View>
        ) : reservasFiltradas.length === 0 ? (
          <View style={styles.estado}>
            <Text style={styles.textoEstado}>
              No tenés reservas {vista === "proximas" ? "próximas" : "pasadas"}.
            </Text>
          </View>
        ) : (
          reservasFiltradas.map((reserva) => (
            <Pressable
              key={reserva.id}
              style={styles.tarjeta}
              onPress={() =>
                router.push({
                  pathname: "/(jugador)/reserva/[id]",
                  params: { id: reserva.id },
                })
              }
            >
              <Text style={styles.nombreEspacio}>
                Cancha {reserva.espacioId.replace("espacio-", "")}
              </Text>
              <Text style={styles.detalle}>
                {formatearFecha(reserva.fechaHoraInicio)} ·{" "}
                {formatearHora(reserva.fechaHoraInicio)}
              </Text>
              <Text style={styles.detalle}>
                Jugadores: {reserva.cantidadJugadores}
              </Text>
              <Text style={styles.estadoReserva}>Estado: {reserva.estado}</Text>
              <Text style={styles.accion}>Ver reserva →</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1120" },
  content: { padding: 20, paddingBottom: 36 },
  title: { color: "#fff", fontSize: 30, fontWeight: "900", marginBottom: 8 },
  offline: { color: "#fef08a", fontSize: 15, fontWeight: "800", marginBottom: 16 },
  tabs: { flexDirection: "row", gap: 10, marginBottom: 20 },
  tab: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#52627a",
    backgroundColor: "#172238",
  },
  tabActivo: { backgroundColor: "#d9f99d", borderColor: "#ecfccb" },
  tabTexto: { color: "#fff", fontSize: 15, fontWeight: "800" },
  tabTextoActivo: { color: "#172238" },
  tarjeta: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#52627a",
    padding: 18,
    marginBottom: 12,
  },
  nombreEspacio: { color: "#fff", fontSize: 20, fontWeight: "900", marginBottom: 8 },
  detalle: { color: "#dbe7f5", fontSize: 15, lineHeight: 23 },
  estadoReserva: { color: "#d9f99d", fontWeight: "800", marginTop: 8 },
  accion: { color: "#fff", fontWeight: "900", marginTop: 14 },
  estado: { alignItems: "center", paddingVertical: 50, gap: 14 },
  textoEstado: { color: "#dbe7f5", fontSize: 17, textAlign: "center" },
  error: { color: "#fecaca", fontSize: 16, textAlign: "center" },
  botonSecundario: { padding: 14, borderWidth: 1, borderColor: "#8fa2bc" },
  textoBoton: { color: "#fff", fontWeight: "800" },
});
