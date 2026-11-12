import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AuthGuard } from "@/components/auth-guard";
import { Colors, Fonts } from "@/constants/theme";
import { apiPost } from "@/servicios/api";
import { authenticateWithBiometrics } from "@/servicios/auth";

export default function EscanerAdminScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [biometriaValidada, setBiometriaValidada] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [espacioId, setEspacioId] = useState("");

  const [resultado, setResultado] = useState<
    "permitido" | "denegado" | null
  >(null);

  const [mensaje, setMensaje] = useState(
    "Autenticá tu identidad para habilitar el escáner.",
  );

  const [procesando, setProcesando] = useState(false);

  async function habilitarEscaner() {
    setAutenticando(true);
    setMensaje("");

    try {
      const autenticado = await authenticateWithBiometrics();

      if (!autenticado) {
        setMensaje("ACCESO DENEGADO - AUTENTICACIÓN BIOMÉTRICA FALLIDA");
        setResultado("denegado");
        return;
      }

      const permiso = permission?.granted
        ? permission
        : await requestPermission();

      if (!permiso.granted) {
        setMensaje("ACCESO DENEGADO - PERMISO DE CÁMARA RECHAZADO");
        setResultado("denegado");
        return;
      }

      setBiometriaValidada(true);
      setEscaneando(false);
      setResultado(null);
      setMensaje("Ingresá el identificador del espacio y escaneá el QR.");
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo habilitar la cámara.",
      );
      setResultado("denegado");
    } finally {
      setAutenticando(false);
    }
  }

  async function procesarQr(codigoQr: string) {
    if (procesando || !escaneando) return;

    const espacio = espacioId.trim();

    if (!/^esp-[A-Za-z0-9_-]{1,36}$/.test(espacio)) {
      setEscaneando(false);
      setResultado("denegado");
      setMensaje("Ingresá un identificador de espacio válido (esp-...).");
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      );
      return;
    }

    setProcesando(true);
    setEscaneando(false);
    setResultado(null);
    setMensaje("Registrando ingreso...");

    try {
      await apiPost("/ingresos", {
        codigoQr,
        espacioId: espacio,
      });

      setResultado("permitido");
      setMensaje("INGRESO REGISTRADO CORRECTAMENTE.");
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
    } catch (error) {
      setResultado("denegado");
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el ingreso.",
      );
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <AuthGuard allowedRoles={["administrador"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Escáner QR</Text>

        <Text style={styles.helperText}>
          Uso exclusivo del administrador.
        </Text>

        <View style={styles.navigationRow}>
          <Pressable
            style={styles.navigationButton}
            onPress={() => router.back()}
          >
            <Text style={styles.navigationText}>Volver</Text>
          </Pressable>

          <Pressable
            style={styles.navigationButton}
            onPress={() => router.push("/(admin)/agenda")}
          >
            <Text style={styles.navigationText}>Ir a agenda</Text>
          </Pressable>
        </View>

        {!biometriaValidada ? (
          <View style={styles.centered}>
            <Text style={styles.bodyText}>{mensaje}</Text>

            <Pressable
              style={styles.primaryButton}
              disabled={autenticando}
              onPress={() => void habilitarEscaner()}
            >
              <Text style={styles.primaryButtonText}>
                {autenticando
                  ? "Validando..."
                  : "[ Autenticar y abrir cámara ]"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Identificador del espacio</Text>

            <TextInput
              value={espacioId}
              onChangeText={setEspacioId}
              style={styles.input}
              autoCapitalize="none"
              placeholder="Ejemplo: esp-..."
              placeholderTextColor="#9aa8bb"
            />

            <View style={styles.cameraFrame}>
              {permission?.granted && escaneando ? (
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={({ data }) => void procesarQr(data)}
                />
              ) : (
                <View style={styles.cameraMessage}>
                  <Text style={styles.bodyText}>
                    {procesando
                      ? "Registrando ingreso..."
                      : mensaje}
                  </Text>
                </View>
              )}
            </View>

            {resultado && (
              <View
                style={[
                  styles.resultBox,
                  resultado === "permitido"
                    ? styles.successBox
                    : styles.errorBox,
                ]}
              >
                <Text style={styles.resultText}>{mensaje}</Text>
              </View>
            )}

            <View style={styles.actions}>
              <Pressable
                style={styles.primaryButton}
                disabled={procesando || escaneando}
                onPress={() => {
                  setResultado(null);
                  setMensaje("Apuntá al código QR de la reserva.");
                  setEscaneando(true);
                }}
              >
                <Text style={styles.primaryButtonText}>
                  [ Escanear QR ]
                </Text>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                disabled={procesando}
                onPress={() => {
                  setBiometriaValidada(false);
                  setEscaneando(false);
                  setResultado(null);
                }}
              >
                <Text style={styles.secondaryButtonText}>
                  [ Cerrar escáner ]
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {autenticando && (
          <ActivityIndicator
            color={Colors.light.backgroundSelected}
            size="large"
          />
        )}
      </View>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    padding: 20,
  },
  title: {
    color: Colors.light.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 18,
    fontFamily: Fonts.sans,
  },
  helperText: {
    color: Colors.light.text,
    fontSize: 15,
    marginTop: 6,
    marginBottom: 18,
    fontFamily: Fonts.sans,
  },
  navigationRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  navigationButton: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  navigationText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  label: {
    color: Colors.light.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
    fontFamily: Fonts.sans,
  },
  input: {
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 9,
    padding: 13,
    fontSize: 17,
    marginBottom: 14,
    fontFamily: Fonts.sans,
  },
  centered: { alignItems: "center", paddingVertical: 32 },
  bodyText: {
    color: Colors.light.text,
    fontSize: 17,
    textAlign: "center",
    lineHeight: 24,
    fontFamily: Fonts.sans,
  },
  cameraFrame: {
    height: 330,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 10,
  },
  cameraMessage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  primaryButton: {
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 9,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    fontFamily: Fonts.sans,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 9,
    backgroundColor: Colors.light.background,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  resultBox: {
    padding: 20,
    marginTop: 16,
    minHeight: 90,
    justifyContent: "center",
    borderRadius: 12,
  },
  successBox: { backgroundColor: Colors.light.backgroundSelected },
  errorBox: { backgroundColor: Colors.light.text },
  resultText: {
    color: Colors.light.background,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "900",
    textAlign: "center",
    fontFamily: Fonts.sans,
  },
  actions: { marginTop: 6 },
});