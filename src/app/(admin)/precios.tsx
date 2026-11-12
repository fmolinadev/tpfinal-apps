import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthGuard } from "@/components/auth-guard";
import { Colors, Fonts } from "@/constants/theme";
import { actualizarPrecio } from "@/servicios/admin-precios";
import { getEspacios } from "@/servicios/espacios";
import type { Espacio } from "@/tipos";

export default function PreciosAdminScreen() {
  const router = useRouter();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [precio, setPrecio] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    getEspacios().then((respuesta) => {
      if (!("error" in respuesta)) setEspacios(respuesta.datos);
    });
  }, []);

  function comenzarEdicion(espacio: Espacio) {
    setEditando(espacio.id);
    setPrecio(String(espacio.precioPorHora));
    setMensaje(null);
  }

 async function guardarPrecio(espacioId: string) {
  const valor = Number(precio.replace(",", "."));

  if (!Number.isInteger(valor) || valor < 1) {
    setMensaje("El precio debe ser un número entero mayor que cero.");
    return;
  }

  const respuesta = await actualizarPrecio(espacioId, valor);

  if (!respuesta.ok) {
    setMensaje(respuesta.mensaje);
    return;
  }

  setEspacios((actuales) =>
    actuales.map((espacio) =>
      espacio.id === espacioId
        ? { ...espacio, precioPorHora: valor }
        : espacio,
    ),
  );

  setEditando(null);
  setMensaje(respuesta.mensaje);
}

  return (
    <AuthGuard allowedRoles={["administrador"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>← Volver</Text></Pressable>
        <Text style={styles.eyebrow}>CONFIGURACIÓN</Text>
        <Text style={styles.title}>Precios por espacio</Text>
        <Text style={styles.subtitle}>Editá el valor por hora. El cambio se aplica a los turnos libres.</Text>
        {mensaje ? <Text style={styles.message}>{mensaje}</Text> : null}
        {espacios.map((espacio) => (
          <View key={espacio.id} style={styles.card}>
            <View style={styles.row}><View><Text style={styles.cardTitle}>{espacio.nombre}</Text><Text style={styles.meta}>{espacio.deporte} · {espacio.complejo}</Text></View><Text style={styles.current}>$ {espacio.precioPorHora.toLocaleString("es-AR")}</Text></View>
            {editando === espacio.id ? <View style={styles.editor}>
              <TextInput value={precio} onChangeText={setPrecio} keyboardType="decimal-pad" style={styles.input} placeholder="Nuevo precio" placeholderTextColor={Colors.light.textSecondary} />
              <View style={styles.actions}><Pressable style={styles.primary} onPress={() => void guardarPrecio(espacio.id)}><Text style={styles.primaryText}>Guardar</Text></Pressable><Pressable style={styles.secondary} onPress={() => setEditando(null)}><Text style={styles.secondaryText}>Cancelar</Text></Pressable></View>
            </View> : <Pressable style={styles.editButton} onPress={() => comenzarEdicion(espacio)}><Text style={styles.editText}>Editar precio</Text></Pressable>}
          </View>
        ))}
      </ScrollView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundElement },
  content: { padding: 20, gap: 14 },
  back: { color: Colors.light.textSecondary, fontWeight: "800", fontFamily: Fonts.sans },
  eyebrow: { color: Colors.light.textSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 1.2, fontFamily: Fonts.sans },
  title: { color: Colors.light.text, fontSize: 30, fontWeight: "900", fontFamily: Fonts.sans },
  subtitle: { color: Colors.light.text, fontSize: 15, lineHeight: 21, fontFamily: Fonts.sans },
  message: { color: Colors.light.textSecondary, fontWeight: "800", fontFamily: Fonts.sans },
  card: { backgroundColor: Colors.light.background, borderRadius: 14, borderWidth: 1, borderColor: Colors.light.backgroundElement, padding: 16, gap: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  cardTitle: { color: Colors.light.text, fontSize: 18, fontWeight: "800", fontFamily: Fonts.sans },
  meta: { color: Colors.light.text, marginTop: 4, textTransform: "capitalize", fontFamily: Fonts.sans },
  current: { color: Colors.light.textSecondary, fontSize: 17, fontWeight: "900", fontFamily: Fonts.sans },
  editor: { gap: 10 },
  input: { borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 9, padding: 12, color: Colors.light.text, backgroundColor: Colors.light.background, fontFamily: Fonts.sans },
  actions: { flexDirection: "row", gap: 10 },
  primary: { flex: 1, backgroundColor: Colors.light.backgroundSelected, borderRadius: 9, padding: 13, alignItems: "center" },
  primaryText: { color: Colors.light.background, fontWeight: "800", fontFamily: Fonts.sans },
  secondary: { flex: 1, borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 9, padding: 13, alignItems: "center" },
  secondaryText: { color: Colors.light.textSecondary, fontWeight: "800", fontFamily: Fonts.sans },
  editButton: { borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 9, padding: 12, alignItems: "center" },
  editText: { color: Colors.light.textSecondary, fontWeight: "800", fontFamily: Fonts.sans },
});
