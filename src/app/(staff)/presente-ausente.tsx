import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { marcarAsistencia, type EstadoAsistencia } from "@/servicios/admin";
import { reservas } from "@/mocks";
import { Colors, Fonts } from "@/constants/theme";

export default function PresenteAusenteScreen() {
  const [estados, setEstados] = useState<Record<string, EstadoAsistencia>>({});

  async function marcar(reservaId: string, estado: EstadoAsistencia) {
    await marcarAsistencia(reservaId, estado);
    setEstados((actuales) => ({ ...actuales, [reservaId]: estado }));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>CONTROL DE ASISTENCIA</Text>
      <Text style={styles.title}>Presente / Ausente</Text>
      <Text style={styles.subtitle}>Registrá la asistencia de las reservas confirmadas.</Text>
      {reservas.map((reserva) => <View key={reserva.id} style={styles.card}>
        <View><Text style={styles.cardTitle}>Reserva {reserva.id}</Text><Text style={styles.detail}>{reserva.fechaHoraInicio}</Text></View>
        <View style={styles.actions}>
          <Pressable onPress={() => void marcar(reserva.id, "presente")} style={[styles.action, estados[reserva.id] === "presente" && styles.selected]}><Text style={styles.actionText}>Presente</Text></Pressable>
          <Pressable onPress={() => void marcar(reserva.id, "ausente")} style={[styles.action, estados[reserva.id] === "ausente" && styles.selected]}><Text style={styles.actionText}>Ausente</Text></Pressable>
        </View>
      </View>)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundElement },
  content: { padding: 20, gap: 14 },
  eyebrow: { color: Colors.light.textSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 1.3, fontFamily: Fonts.sans },
  title: { fontSize: 30, fontWeight: "800", color: Colors.light.text, fontFamily: Fonts.sans },
  subtitle: { color: Colors.light.text, fontSize: 15, fontFamily: Fonts.sans },
  card: { backgroundColor: Colors.light.background, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.light.backgroundElement, gap: 14 },
  cardTitle: { color: Colors.light.text, fontWeight: "800", fontSize: 17, fontFamily: Fonts.sans },
  detail: { color: Colors.light.text, marginTop: 4, fontFamily: Fonts.sans },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1, borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 10, padding: 11, alignItems: "center" },
  selected: { backgroundColor: Colors.light.backgroundSelected },
  actionText: { color: Colors.light.textSecondary, fontWeight: "800", fontFamily: Fonts.sans },
});
