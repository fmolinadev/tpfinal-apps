import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { bloquearTurno } from "@/servicios/admin";
import { Colors, Fonts } from "@/constants/theme";

export default function BloqueosScreen() {
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function crearBloqueo() {
    const respuesta = await bloquearTurno("espacio-1", new Date().toISOString(), motivo || "Mantenimiento operativo");
    setMensaje("error" in respuesta ? respuesta.error.mensaje : "Horario bloqueado correctamente.");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>OPERACIONES</Text>
      <Text style={styles.title}>Bloquear horario</Text>
      <Text style={styles.subtitle}>
        Registrá un bloqueo por mantenimiento o necesidad operativa.
      </Text>
      <View style={styles.card}>
        <Text style={styles.label}>Espacio</Text>
        <Text style={styles.value}>Cancha 1 · Hoy</Text>
        <Text style={styles.label}>Motivo</Text>
        <TextInput value={motivo} onChangeText={setMotivo} placeholder="Ej. mantenimiento" placeholderTextColor={Colors.light.textSecondary} style={styles.input} />
        <Pressable style={styles.button} onPress={() => void crearBloqueo()}><Text style={styles.buttonText}>Confirmar bloqueo</Text></Pressable>
        {mensaje ? <Text style={styles.message}>{mensaje}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundElement, padding: 20, justifyContent: "center", gap: 14 },
  eyebrow: { color: Colors.light.textSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 1.3, fontFamily: Fonts.sans },
  title: { fontSize: 30, fontWeight: "800", color: Colors.light.text, fontFamily: Fonts.sans },
  subtitle: { fontSize: 15, color: Colors.light.text, lineHeight: 21, fontFamily: Fonts.sans },
  card: { backgroundColor: Colors.light.background, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.light.backgroundElement, gap: 8 },
  label: { color: Colors.light.textSecondary, fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginTop: 5, fontFamily: Fonts.sans },
  value: { color: Colors.light.text, fontSize: 16, fontWeight: "700", fontFamily: Fonts.sans },
  input: { borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 10, padding: 12, color: Colors.light.text, fontFamily: Fonts.sans },
  button: { backgroundColor: Colors.light.backgroundSelected, borderRadius: 10, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: Colors.light.background, fontWeight: "800", fontFamily: Fonts.sans },
  message: { color: Colors.light.textSecondary, fontWeight: "700", marginTop: 6, fontFamily: Fonts.sans },
});
