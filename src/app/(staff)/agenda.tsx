import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { getEspacios } from "@/servicios/espacios";
import { obtenerTurnos } from "@/servicios/turnos";
import type { Espacio } from "@/tipos";
import type { EstadoTurno, Turno } from "@/tipos/turno";

function fechaActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

function colorEstado(estado: EstadoTurno): string {
  return estado === "libre"
    ? Colors.light.textSecondary
    : estado === "mantenimiento"
      ? Colors.light.text
      : Colors.light.backgroundSelected;
}

export default function AgendaScreen() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioSeleccionado, setEspacioSeleccionado] =
    useState<Espacio | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargandoTurnos, setCargandoTurnos] = useState(false);

  useEffect(() => {
    getEspacios().then((respuesta) => {
      if (!("error" in respuesta)) setEspacios(respuesta.datos);
    });
  }, []);

  async function verHorarios(espacio: Espacio) {
    setEspacioSeleccionado(espacio);
    setCargandoTurnos(true);
    setTurnos(await obtenerTurnos(espacio.id, fechaActual()));
    setCargandoTurnos(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>OPERACIONES</Text>
      <Text style={styles.title}>Agenda del complejo</Text>
      <Text style={styles.subtitle}>
        Supervisá los espacios y la actividad del día.
      </Text>
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryNumber}>{espacios.length || "-"}</Text>
          <Text style={styles.summaryLabel}>Espacios activos</Text>
        </View>
        <View>
          <Text style={styles.summaryNumber}>12</Text>
          <Text style={styles.summaryLabel}>Reservas de hoy</Text>
        </View>
        <View>
          <Text style={styles.summaryNumber}>04</Text>
          <Text style={styles.summaryLabel}>En curso</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Estado de los espacios</Text>
      {espacios.length === 0 ? (
        <ActivityIndicator color={Colors.light.backgroundSelected} />
      ) : (
        espacios.map((espacio) => (
          <Pressable
            key={espacio.id}
            style={[
              styles.card,
              espacioSeleccionado?.id === espacio.id && styles.cardSelected,
            ]}
            onPress={() => void verHorarios(espacio)}
          >
            <View>
              <Text style={styles.cardTitle}>{espacio.nombre}</Text>
              <Text style={styles.meta}>
                {espacio.deporte} · {espacio.complejo}
              </Text>
            </View>
            <View style={styles.status}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Ver horarios</Text>
            </View>
          </Pressable>
        ))
      )}
      {espacioSeleccionado ? (
        <View style={styles.scheduleSection}>
          <View style={styles.scheduleHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {espacioSeleccionado.nombre}
              </Text>
              <Text style={styles.meta}>Horarios del {fechaActual()}</Text>
            </View>
            <Pressable onPress={() => setEspacioSeleccionado(null)}>
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </View>
          {cargandoTurnos ? (
            <ActivityIndicator color={Colors.light.backgroundSelected} />
          ) : (
            turnos.map((turno) => (
              <View key={turno.id} style={styles.turnoCard}>
                <Text style={styles.turnoHora}>{turno.hora}</Text>
                <Text style={styles.turnoPrecio}>
                  $ {turno.precio.toLocaleString("es-AR")}
                </Text>
                <Text
                  style={[
                    styles.turnoEstado,
                    { color: colorEstado(turno.estado) },
                  ]}
                >
                  {turno.estado}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundElement },
  content: { padding: 20, gap: 14 },
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
  subtitle: { color: Colors.light.text, fontSize: 15, fontFamily: Fonts.sans },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
  },
  summaryNumber: {
    color: Colors.light.backgroundSelected,
    fontSize: 25,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  summaryLabel: {
    color: Colors.light.text,
    fontSize: 12,
    marginTop: 3,
    fontFamily: Fonts.sans,
  },
  sectionTitle: {
    color: Colors.light.text,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 6,
    fontFamily: Fonts.sans,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardSelected: {
    borderColor: Colors.light.backgroundSelected,
    borderWidth: 2,
  },
  cardTitle: {
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  meta: {
    color: Colors.light.text,
    marginTop: 4,
    textTransform: "capitalize",
    fontFamily: Fonts.sans,
  },
  status: { alignItems: "flex-end", gap: 4 },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.backgroundSelected,
  },
  statusText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: Fonts.sans,
  },
  scheduleSection: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    gap: 10,
    marginTop: 4,
  },
  scheduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  closeText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  turnoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundElement,
    paddingVertical: 12,
    gap: 10,
  },
  turnoHora: {
    color: Colors.light.text,
    fontSize: 17,
    fontWeight: "900",
    minWidth: 54,
    fontFamily: Fonts.sans,
  },
  turnoPrecio: {
    color: Colors.light.text,
    flex: 1,
    fontFamily: Fonts.sans,
  },
  turnoEstado: {
    fontWeight: "900",
    textTransform: "uppercase",
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
});
