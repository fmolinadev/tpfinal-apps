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

function esProxima(reserva: Reserva): boolean {
  return new Date(reserva.fechaHoraInicio).getTime() >= Date.now();
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
        await guardarReservasEnCache(respuesta.datos);
      } catch {
        const reservasCacheadas = await obtenerReservasDesdeCache();
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
        {modoOffline && (
          <Text style={styles.offlineText}>Modo sin conexión</Text>
        )}

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tabButton, vista === "proximas" && styles.tabActive]}
            onPress={() => setVista("proximas")}
          >
            <Text
              style={[
                styles.tabText,
                vista === "proximas" && styles.tabTextActive,
              ]}
            >
              [ Próximas ]
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, vista === "pasadas" && styles.tabActive]}
            onPress={() => setVista("pasadas")}
          >
            <Text
              style={[
                styles.tabText,
                vista === "pasadas" && styles.tabTextActive,
              ]}
            >
              [ Pasadas ]
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#d9f99d" />
            <Text style={styles.stateText}>Cargando reservas...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => void cargarReservas()}
            >
              <Text style={styles.secondaryButtonText}>[ Reintentar ]</Text>
            </Pressable>
          </View>
        ) : reservasFiltradas.length === 0 ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>
              No tenés reservas {vista === "proximas" ? "próximas" : "pasadas"}.
            </Text>
          </View>
        ) : (
          reservasFiltradas.map((reserva) => (
            <Pressable
              key={reserva.id}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/reserva/[id]",
                  params: { id: reserva.id },
                })
              }
            >
              <Text style={styles.cardTitle}>
                Cancha {reserva.espacioId.replace("espacio-", "")}
              </Text>
              <Text style={styles.cardText}>
                {formatearFecha(reserva.fechaHoraInicio)} -{" "}
                {formatearHora(reserva.fechaHoraInicio)}
              </Text>
              <Text style={styles.cardText}>
                Jugadores: {reserva.cantidadJugadores}
              </Text>
              <Text style={styles.cardStatus}>Estado: {reserva.estado}</Text>
              <Text style={styles.cardAction}>[ Ver reserva ]</Text>
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
  title: { color: "#ffffff", fontSize: 30, fontWeight: "900", marginBottom: 8 },
  offlineText: {
    color: "#fef08a",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 16,
  },
  tabs: { flexDirection: "row", gap: 10, marginBottom: 20 },
  tabButton: {
    flex: 1,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#52627a",
    backgroundColor: "#172238",
  },
  tabActive: { backgroundColor: "#d9f99d", borderColor: "#ecfccb" },
  tabText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  tabTextActive: { color: "#172238" },
  card: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#52627a",
    padding: 18,
    marginBottom: 12,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 8,
  },
  cardText: { color: "#dbe7f5", fontSize: 16, lineHeight: 24 },
  cardStatus: {
    color: "#d9f99d",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8,
  },
  cardAction: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 14,
  },
  stateContainer: { alignItems: "center", paddingVertical: 50 },
  stateText: { color: "#dbe7f5", fontSize: 17, textAlign: "center" },
  errorText: {
    color: "#fecaca",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
    marginBottom: 16,
  },
  secondaryButton: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#8fa2bc",
    backgroundColor: "#172238",
  },
  secondaryButtonText: { color: "#ffffff", fontWeight: "800" },
});
