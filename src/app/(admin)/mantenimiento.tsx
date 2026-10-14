import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthGuard } from "@/components/auth-guard";
import { Colors, Fonts } from "@/constants/theme";
import { espacios } from "@/mocks";
import { actualizarMantenimiento, crearMantenimiento, eliminarMantenimiento } from "@/servicios/admin";
import { mantenimientosMock } from "@/mocks/turnos";
import type { Mantenimiento } from "@/tipos/turno";

const formularioInicial = { espacioId: "espacio-1", fecha: "2026-09-20", horaInicio: "09:00", horaFin: "10:00", motivo: "", activo: true };

type FormularioMantenimiento = typeof formularioInicial;

export default function MantenimientoAdminScreen() {
  const router = useRouter();
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([...mantenimientosMock]);
  const [formulario, setFormulario] = useState<FormularioMantenimiento>(formularioInicial);
  const [editando, setEditando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function actualizarCampo(campo: keyof FormularioMantenimiento, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  function comenzarEdicion(item: Mantenimiento) {
    setEditando(item.id);
    setFormulario({ espacioId: item.espacioId, fecha: item.fecha, horaInicio: item.horaInicio, horaFin: item.horaFin, motivo: item.motivo, activo: item.activo });
    setMensaje(null);
  }

  function limpiarFormulario() {
    setEditando(null);
    setFormulario(formularioInicial);
  }

  async function guardar() {
    const respuesta = editando ? await actualizarMantenimiento(editando, formulario) : await crearMantenimiento(formulario);
    setMensaje(respuesta.mensaje);
    if (!respuesta.ok) return;
    setMantenimientos([...mantenimientosMock]);
    limpiarFormulario();
  }

  async function eliminar(id: string) {
    const respuesta = await eliminarMantenimiento(id);
    setMensaje(respuesta.mensaje);
    if (respuesta.ok) setMantenimientos([...mantenimientosMock]);
  }

  return (
    <AuthGuard allowedRoles={["administrador"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>← Volver</Text></Pressable>
        <Text style={styles.eyebrow}>OPERACIONES</Text>
        <Text style={styles.title}>Mantenimiento</Text>
        <Text style={styles.subtitle}>Bloqueá horarios para tareas técnicas y mantené actualizado el calendario.</Text>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editando ? "Editar mantenimiento" : "Nuevo mantenimiento"}</Text>
          <TextInput value={formulario.espacioId} onChangeText={(valor) => actualizarCampo("espacioId", valor)} style={styles.input} placeholder="Espacio: espacio-1" placeholderTextColor={Colors.light.textSecondary} />
          <TextInput value={formulario.fecha} onChangeText={(valor) => actualizarCampo("fecha", valor)} style={styles.input} placeholder="Fecha AAAA-MM-DD" placeholderTextColor={Colors.light.textSecondary} />
          <View style={styles.fieldsRow}><TextInput value={formulario.horaInicio} onChangeText={(valor) => actualizarCampo("horaInicio", valor)} style={styles.halfInput} placeholder="Inicio HH:MM" placeholderTextColor={Colors.light.textSecondary} /><TextInput value={formulario.horaFin} onChangeText={(valor) => actualizarCampo("horaFin", valor)} style={styles.halfInput} placeholder="Fin HH:MM" placeholderTextColor={Colors.light.textSecondary} /></View>
          <TextInput value={formulario.motivo} onChangeText={(valor) => actualizarCampo("motivo", valor)} style={styles.input} placeholder="Motivo del mantenimiento" placeholderTextColor={Colors.light.textSecondary} />
          <View style={styles.actions}><Pressable style={styles.primary} onPress={() => void guardar()}><Text style={styles.primaryText}>{editando ? "Guardar cambios" : "Crear mantenimiento"}</Text></Pressable>{editando ? <Pressable style={styles.secondary} onPress={limpiarFormulario}><Text style={styles.secondaryText}>Cancelar</Text></Pressable> : null}</View>
          {mensaje ? <Text style={styles.message}>{mensaje}</Text> : null}
        </View>
        <Text style={styles.sectionTitle}>Mantenimientos registrados</Text>
        {mantenimientos.map((item) => <View key={item.id} style={styles.card}><View style={styles.cardInfo}><Text style={styles.cardTitle}>{espacios.find((espacio) => espacio.id === item.espacioId)?.nombre ?? item.espacioId}</Text><Text style={styles.detail}>{item.fecha} · {item.horaInicio} a {item.horaFin}</Text><Text style={styles.detail}>{item.motivo}</Text></View><View style={styles.actions}><Pressable style={styles.smallButton} onPress={() => comenzarEdicion(item)}><Text style={styles.smallText}>Editar</Text></Pressable><Pressable style={styles.deleteButton} onPress={() => void eliminar(item.id)}><Text style={styles.deleteText}>Eliminar</Text></Pressable></View></View>)}
      </ScrollView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundElement }, content: { padding: 20, gap: 14 },
  back: { color: Colors.light.textSecondary, fontWeight: "800", fontFamily: Fonts.sans }, eyebrow: { color: Colors.light.textSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 1.2, fontFamily: Fonts.sans }, title: { color: Colors.light.text, fontSize: 30, fontWeight: "900", fontFamily: Fonts.sans }, subtitle: { color: Colors.light.text, fontSize: 15, lineHeight: 21, fontFamily: Fonts.sans },
  formCard: { backgroundColor: Colors.light.background, borderRadius: 14, borderWidth: 1, borderColor: Colors.light.backgroundElement, padding: 16, gap: 10 }, formTitle: { color: Colors.light.text, fontSize: 18, fontWeight: "800", fontFamily: Fonts.sans }, input: { borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 9, padding: 12, color: Colors.light.text, backgroundColor: Colors.light.background, fontFamily: Fonts.sans }, fieldsRow: { flexDirection: "row", gap: 10 }, halfInput: { flex: 1, borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 9, padding: 12, color: Colors.light.text, fontFamily: Fonts.sans }, actions: { flexDirection: "row", gap: 8, marginTop: 4 }, primary: { flex: 1, backgroundColor: Colors.light.backgroundSelected, borderRadius: 9, padding: 13, alignItems: "center" }, primaryText: { color: Colors.light.background, fontWeight: "800", fontFamily: Fonts.sans }, secondary: { flex: 1, borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 9, padding: 13, alignItems: "center" }, secondaryText: { color: Colors.light.textSecondary, fontWeight: "800", fontFamily: Fonts.sans }, message: { color: Colors.light.textSecondary, fontWeight: "800", fontFamily: Fonts.sans }, sectionTitle: { color: Colors.light.text, fontSize: 19, fontWeight: "800", marginTop: 8, fontFamily: Fonts.sans }, card: { backgroundColor: Colors.light.background, borderRadius: 14, borderWidth: 1, borderColor: Colors.light.backgroundElement, padding: 15, gap: 12 }, cardInfo: { gap: 4 }, cardTitle: { color: Colors.light.text, fontSize: 17, fontWeight: "800", fontFamily: Fonts.sans }, detail: { color: Colors.light.text, fontFamily: Fonts.sans }, smallButton: { borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 8, padding: 10, alignItems: "center" }, smallText: { color: Colors.light.textSecondary, fontWeight: "800", fontFamily: Fonts.sans }, deleteButton: { borderWidth: 1, borderColor: Colors.light.text, borderRadius: 8, padding: 10, alignItems: "center" }, deleteText: { color: Colors.light.text, fontWeight: "800", fontFamily: Fonts.sans },
});
