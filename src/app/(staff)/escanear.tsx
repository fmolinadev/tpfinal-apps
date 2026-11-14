import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { registrarIngreso as crearIngreso } from "@/servicios/ingresos";

export default function EscanearScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [codigo, setCodigo] = useState("");
  const [espacioId, setEspacioId] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const procesandoRef = useRef(false);

  async function reproducirFeedbackHaptico(exito: boolean) {
    try {
      await Haptics.notificationAsync(
        exito
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
    } catch (error) {
      console.warn("No se pudo reproducir la respuesta háptica.", error);
    }
  }

  async function registrarIngreso(codigoLeido = codigo) {
    if (procesandoRef.current) return;

    const codigoQr = codigoLeido.trim();
    const espacio = espacioId.trim();

    setMensaje(null);

    if (!codigoQr) {
      setMensaje("Ingresá el código QR de la reserva.");
      await reproducirFeedbackHaptico(false);
      return;
    }

    if (!/^esp-[A-Za-z0-9_-]{1,36}$/.test(espacio)) {
      setMensaje("Ingresá un ID de espacio válido. Debe comenzar con esp-.");
      await reproducirFeedbackHaptico(false);
      return;
    }

    try {
      procesandoRef.current = true;
      setRegistrando(true);
      setEscaneando(false);

      await crearIngreso(codigoQr, espacio);

      setMensaje("Ingreso registrado correctamente.");
      setCodigo("");
      await reproducirFeedbackHaptico(true);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el ingreso.",
      );
      await reproducirFeedbackHaptico(false);
    } finally {
      procesandoRef.current = false;
      setRegistrando(false);
    }
  }

  async function abrirCamara() {
    try {
      const permiso = permission?.granted
        ? permission
        : await requestPermission();

      if (!permiso.granted) {
        setMensaje("Se necesita permiso de cámara para leer el código QR.");
        await reproducirFeedbackHaptico(false);
        return;
      }

      setMensaje("Apuntá al código QR de la reserva.");
      setEscaneando(true);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo habilitar la cámara.",
      );
      await reproducirFeedbackHaptico(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>CONTROL DE INGRESO</Text>
      <Text style={styles.title}>Registrar ingreso</Text>
      <Text style={styles.subtitle}>
        Escaneá el QR de la reserva e indicá el espacio para registrar el
        ingreso del jugador.
      </Text>

      <View style={styles.scanBox}>
        {escaneando && permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => {
              setEscaneando(false);
              void registrarIngreso(data);
            }}
          />
        ) : (
          <>
            <Text style={styles.scanIcon}>QR</Text>
            <Text style={styles.scanText}>
              {registrando ? "Registrando ingreso..." : "Registro de acceso"}
            </Text>
          </>
        )}
      </View>

      <Text style={styles.label}>ID del espacio</Text>
      <TextInput
        value={espacioId}
        onChangeText={setEspacioId}
        placeholder="Ej. esp-1"
        placeholderTextColor={Colors.light.textSecondary}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Pressable
        style={[styles.button, (registrando || escaneando) && styles.disabled]}
        disabled={registrando || escaneando}
        onPress={() => void abrirCamara()}
      >
        <Text style={styles.buttonText}>
          {escaneando ? "Escaneando..." : "Abrir cámara y escanear QR"}
        </Text>
      </Pressable>

      <Text style={styles.label}>O ingresá el código manualmente</Text>
      <TextInput
        value={codigo}
        onChangeText={setCodigo}
        placeholder="Código QR de la reserva"
        placeholderTextColor={Colors.light.textSecondary}
        style={styles.input}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <Pressable
        style={[styles.button, registrando && styles.disabled]}
        disabled={registrando}
        onPress={() => void registrarIngreso(codigo)}
      >
        <Text style={styles.buttonText}>
          {registrando ? "Registrando..." : "Registrar código manual"}
        </Text>
      </Pressable>

      {mensaje ? (
        <View style={styles.result}>
          <Text style={styles.resultText}>{mensaje}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    padding: 20,
    justifyContent: "center",
    gap: 14,
  },
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
  subtitle: {
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  scanBox: {
    height: 150,
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 8,
  },
  scanIcon: {
    color: Colors.light.backgroundSelected,
    fontSize: 42,
    fontWeight: "800",
    fontFamily: Fonts.mono,
  },
  scanText: {
    color: Colors.light.text,
    fontWeight: "700",
    fontFamily: Fonts.sans,
  },
  label: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    fontFamily: Fonts.sans,
  },
  input: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    padding: 14,
    color: Colors.light.text,
    fontFamily: Fonts.sans,
  },
  button: {
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.light.background,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  result: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 5,
    borderLeftColor: Colors.light.textSecondary,
  },
  resultText: {
    color: Colors.light.text,
    fontWeight: "700",
    fontFamily: Fonts.sans,
  },
});