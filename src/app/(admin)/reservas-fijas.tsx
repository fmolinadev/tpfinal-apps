import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthGuard } from "@/components/auth-guard";
import { Colors, Fonts } from "@/constants/theme";
import { espacios } from "@/mocks";
import { reservasFijasMock } from "@/mocks/reservas";
import { actualizarReservaFija, crearReservaFija, eliminarReservaFija } from "@/servicios/admin";
import type { ReservaFija } from "@/tipos/reserva";

const formularioInicial = { espacioId: "espacio-1", usuarioId: "user_jugador_1", diaSemana: "2", horaInicio: "18:00", horaFin: "19:00", desde: "2026-09-01", hasta: "2026-12-31", activa: true, motivo: "" };

type FormularioReservaFija = typeof formularioInicial;

export default function ReservasFijasAdminScreen() {
  const router = useRouter();
  const [reservas, setReservas] = useState<ReservaFija[]>([...reservasFijasMock]);
  const [formulario, setFormulario] = useState<FormularioReservaFija>(formularioInicial);
  const [editando, setEditando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function actualizarCampo(campo: keyof FormularioReservaFija, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  function comenzarEdicion(item: ReservaFija) {
    setEditando(item.id);
    setFormulario({ espacioId: item.espacioId, usuarioId: item.usuarioId, diaSemana: String(item.diaSemana), horaInicio: item.horaInicio, horaFin: item.horaFin, desde: item.desde, hasta: item.hasta, activa: item.activa, motivo: item.motivo ?? "" });
    setMensaje(null);
  }

  function limpiarFormulario() {
    setEditando(null);
    setFormulario(formularioInicial);
  }

  async function guardar() {
    const input = { ...formulario, diaSemana: Number(formulario.diaSemana) };
    const respuesta = editando ? await actualizarReservaFija(editando, input) : await crearReservaFija(input);
    setMensaje(respuesta.mensaje);
    if (!respuesta.ok) return;
    setReservas([...reservasFijasMock]);
    limpiarFormulario();
  }

  async function eliminar(id: string) {
    const respuesta = await eliminarReservaFija(id);
    setMensaje(respuesta.mensaje);
    if (respuesta.ok) setReservas([...reservasFijasMock]);
  }

  return (
    <AuthGuard allowedRoles={["administrador"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>← Volver</Text></Pressable>
        <Text style={styles.eyebrow}>PROGRAMACIÓN</Text>
        <Text style={styles.title}>Reservas fijas</Text>
        <Text style={styles.subtitle}>Administrá turnos recurrentes con fechas y horarios controlados.</Text>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editando ? "Editar reserva fija" : "Nueva reserva fija"}</Text>
          <TextInput value={formulario.espacioId} onChangeText={(valor) => actualizarCampo("espacioId", valor)} style={styles.input} placeholder="Espacio: espacio-1" placeholderTextColor={Colors.light.textSecondary} />
          <TextInput value={formulario.usuarioId} onChangeText={(valor) => actualizarCampo("usuarioId", valor)} style={styles.input} placeholder="ID del jugador" placeholderTextColor={Colors.light.textSecondary} autoCapitalize="none" />
          <TextInput value={formulario.diaSemana} onChangeText={(valor) => actualizarCampo("diaSemana", valor)} style={styles.input} placeholder="Día: 0 domingo a 6 sábado" placeholderTextColor={Colors.light.textSecondary} keyboardType="number-pad" />
          <View style={styles.fieldsRow}><TextInput value={formulario.horaInicio} onChangeText={(valor) => actualizarCampo("horaInicio", valor)} style={styles.halfInput} placeholder="Inicio HH:MM" placeholderTextColor={Colors.light.textSecondary} /><TextInput value={formulario.horaFin} onChangeText={(valor) => actualizarCampo("horaFin", valor)} style={styles.halfInput} placeholder="Fin HH:MM" placeholderTextColor={Colors.light.textSecondary} /></View>
          <View style={styles.fieldsRow}><TextInput value={formulario.desde} onChangeText={(valor) => actualizarCampo("desde", valor)} style={styles.halfInput} placeholder="Desde AAAA-MM-DD" placeholderTextColor={Colors.light.textSecondary} /><TextInput value={formulario.hasta} onChangeText={(valor) => actualizarCampo("hasta", valor)} style={styles.halfInput} placeholder="Hasta AAAA-MM-DD" placeholderTextColor={Colors.light.textSecondary} /></View>
          <TextInput value={formulario.motivo} onChangeText={(valor) => actualizarCampo("motivo", valor)} style={styles.input} placeholder="Motivo opcional" placeholderTextColor={Colors.light.textSecondary} />
          <View style={styles.actions}><Pressable style={styles.primary} onPress={() => void guardar()}><Text style={styles.primaryText}>{editando ? "Guardar cambios" : "Crear reserva"}</Text></Pressable>{editando ? <Pressable style={styles.secondary} onPress={limpiarFormulario}><Text style={styles.secondaryText}>Cancelar</Text></Pressable> : null}</View>
          {mensaje ? <Text style={styles.message}>{mensaje}</Text> : null}
        </View>
        <Text style={styles.sectionTitle}>Reservas programadas</Text>
        {reservas.map((item) => <View key={item.id} style={styles.card}><View style={styles.cardInfo}><Text style={styles.cardTitle}>{espacios.find((espacio) => espacio.id === item.espacioId)?.nombre ?? item.espacioId}</Text><Text style={styles.detail}>Jugador: {item.usuarioId}</Text><Text style={styles.detail}>Día {item.diaSemana} · {item.horaInicio} a {item.horaFin}</Text><Text style={styles.detail}>{item.desde} al {item.hasta}</Text></View><View style={styles.actions}><Pressable style={styles.smallButton} onPress={() => comenzarEdicion(item)}><Text style={styles.smallText}>Editar</Text></Pressable><Pressable style={styles.deleteButton} onPress={() => void eliminar(item.id)}><Text style={styles.deleteText}>Eliminar</Text></Pressable></View></View>)}
      </ScrollView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundElement }, content: { padding: 20, gap: 14 },
  back: { color: Colors.light.textSecondary, fontWeight: "800", fontFamily: Fonts.sans }, eyebrow: { color: Colors.light.textSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 1.2, fontFamily: Fonts.sans }, title: { color: Colors.light.text, fontSize: 30, fontWeight: "900", fontFamily: Fonts.sans }, subtitle: { color: Colors.light.text, fontSize: 15, lineHeight: 21, fontFamily: Fonts.sans },
  formCard: { backgroundColor: Colors.light.background, borderRadius: 14, borderWidth: 1, borderColor: Colors.light.backgroundElement, padding: 16, gap: 10 }, formTitle: { color: Colors.light.text, fontSize: 18, fontWeight: "800", fontFamily: Fonts.sans }, input: { borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 9, padding: 12, color: Colors.light.text, backgroundColor: Colors.light.background, fontFamily: Fonts.sans }, fieldsRow: { flexDirection: "row", gap: 10 }, halfInput: { flex: 1, borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 9, padding: 12, color: Colors.light.text, fontFamily: Fonts.sans }, actions: { flexDirection: "row", gap: 8, marginTop: 4 }, primary: { flex: 1, backgroundColor: Colors.light.backgroundSelected, borderRadius: 9, padding: 13, alignItems: "center" }, primaryText: { color: Colors.light.background, fontWeight: "800", fontFamily: Fonts.sans }, secondary: { flex: 1, borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 9, padding: 13, alignItems: "center" }, secondaryText: { color: Colors.light.textSecondary, fontWeight: "800", fontFamily: Fonts.sans }, message: { color: Colors.light.textSecondary, fontWeight: "800", fontFamily: Fonts.sans }, sectionTitle: { color: Colors.light.text, fontSize: 19, fontWeight: "800", marginTop: 8, fontFamily: Fonts.sans }, card: { backgroundColor: Colors.light.background, borderRadius: 14, borderWidth: 1, borderColor: Colors.light.backgroundElement, padding: 15, gap: 12 }, cardInfo: { gap: 4 }, cardTitle: { color: Colors.light.text, fontSize: 17, fontWeight: "800", fontFamily: Fonts.sans }, detail: { color: Colors.light.text, fontFamily: Fonts.sans }, smallButton: { borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 8, padding: 10, alignItems: "center" }, smallText: { color: Colors.light.textSecondary, fontWeight: "800", fontFamily: Fonts.sans }, deleteButton: { borderWidth: 1, borderColor: Colors.light.text, borderRadius: 8, padding: 10, alignItems: "center" }, deleteText: { color: Colors.light.text, fontWeight: "800", fontFamily: Fonts.sans },
});
