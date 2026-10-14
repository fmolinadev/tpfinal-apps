import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { validarQrIngreso } from "@/servicios/admin";
import { Colors, Fonts } from "@/constants/theme";

export default function EscanearScreen() {
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [validando, setValidando] = useState(false);

  async function validarCodigo() {
    if (!codigo.trim()) return;
    setValidando(true);
    const respuesta = await validarQrIngreso(codigo.trim());
    setMensaje("error" in respuesta ? respuesta.error.mensaje : respuesta.datos[0]?.mensaje ?? "Código válido");
    setValidando(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>CONTROL DE INGRESO</Text>
      <Text style={styles.title}>Validar reserva</Text>
      <Text style={styles.subtitle}>Ingresá el código del QR presentado por el jugador.</Text>
      <View style={styles.scanBox}><Text style={styles.scanIcon}>QR</Text><Text style={styles.scanText}>Lector de acceso</Text></View>
      <TextInput value={codigo} onChangeText={setCodigo} placeholder="Código QR" placeholderTextColor={Colors.light.textSecondary} style={styles.input} autoCapitalize="none" />
      <Pressable style={[styles.button, validando && styles.disabled]} disabled={validando} onPress={() => void validarCodigo()}><Text style={styles.buttonText}>{validando ? "Validando..." : "Validar acceso"}</Text></Pressable>
      {mensaje ? <View style={styles.result}><Text style={styles.resultText}>{mensaje}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundElement, padding: 20, justifyContent: "center", gap: 14 },
  eyebrow: { color: Colors.light.textSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 1.3, fontFamily: Fonts.sans },
  title: { fontSize: 30, fontWeight: "800", color: Colors.light.text, fontFamily: Fonts.sans },
  subtitle: { color: Colors.light.text, fontSize: 15, lineHeight: 21, fontFamily: Fonts.sans },
  scanBox: { height: 180, borderRadius: 18, borderWidth: 2, borderColor: Colors.light.backgroundSelected, backgroundColor: Colors.light.background, alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 8 },
  scanIcon: { color: Colors.light.backgroundSelected, fontSize: 42, fontWeight: "800", fontFamily: Fonts.mono },
  scanText: { color: Colors.light.text, fontWeight: "700", fontFamily: Fonts.sans },
  input: { backgroundColor: Colors.light.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.backgroundSelected, padding: 14, color: Colors.light.text, fontFamily: Fonts.sans },
  button: { backgroundColor: Colors.light.backgroundSelected, borderRadius: 12, padding: 15, alignItems: "center" },
  disabled: { opacity: 0.6 },
  buttonText: { color: Colors.light.background, fontWeight: "800", fontFamily: Fonts.sans },
  result: { backgroundColor: Colors.light.background, borderRadius: 12, padding: 14, borderLeftWidth: 5, borderLeftColor: Colors.light.textSecondary },
  resultText: { color: Colors.light.text, fontWeight: "700", fontFamily: Fonts.sans },
});
