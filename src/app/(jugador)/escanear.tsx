import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { getCurrentUserSession } from "@/persistencia/session";
import { validarAccesoPorQrEspacio } from "@/servicios/reservas";

type EstadoEscaneo = "permitido" | "denegado";

export default function EscanearAccesoScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [estado, setEstado] = useState<EstadoEscaneo | null>(null);
  const [mensaje, setMensaje] = useState(
    "Escaneá el código QR fijo del espacio para validar tu reserva.",
  );
  const procesandoRef = useRef(false);

  async function iniciarEscaneo() {
    try {
      const permiso = permission?.granted
        ? permission
        : await requestPermission();
      if (!permiso.granted) {
        setEstado("denegado");
        setMensaje("Se necesita permiso de cámara para leer el código QR.");
        return;
      }

      setEstado(null);
      setMensaje("Apuntá al código QR del espacio.");
      setEscaneando(true);
    } catch (error) {
      setEstado("denegado");
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo habilitar la cámara.",
      );
    }
  }

  async function procesarQr(espacioId: string) {
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setProcesando(true);
    setEscaneando(false);

    try {
      const usuario = await getCurrentUserSession();
      if (!usuario) {
        setEstado("denegado");
        setMensaje("La sesión expiró. Volvé a iniciar sesión.");
        return;
      }

      const respuesta = await validarAccesoPorQrEspacio(
        espacioId.trim(),
        usuario.id,
      );
      if ("error" in respuesta && respuesta.error) {
        setEstado("denegado");
        setMensaje(respuesta.error.mensaje);
        return;
      }

      const reserva = respuesta.datos[0];
      setEstado("permitido");
      setMensaje(
        `Acceso habilitado. Reserva para ${new Date(
          reserva.fechaHoraInicio,
        ).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}.`,
      );
    } catch (error) {
      setEstado("denegado");
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo validar la reserva.",
      );
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acceso a la cancha</Text>
      <Text style={styles.subtitle}>
        Escaneá el QR del espacio. Solo se habilita el acceso si tenés una
        reserva propia activa para ese lugar y horario.
      </Text>

      <View style={styles.cameraFrame}>
        {escaneando && permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => void procesarQr(data)}
          />
        ) : (
          <View style={styles.cameraMessage}>
            {procesando ? (
              <ActivityIndicator
                size="large"
                color={Colors.light.backgroundSelected}
              />
            ) : (
              <Text style={styles.bodyText}>{mensaje}</Text>
            )}
          </View>
        )}
      </View>

      {estado && (
        <View
          accessibilityRole="alert"
          style={[
            styles.resultBox,
            estado === "permitido" ? styles.successBox : styles.errorBox,
          ]}
        >
          <Text style={styles.resultText}>{mensaje}</Text>
        </View>
      )}

      <Pressable
        style={[styles.button, procesando && styles.disabled]}
        disabled={procesando}
        onPress={() => void iniciarEscaneo()}
      >
        <Text style={styles.buttonText}>
          {procesando
            ? "Validando..."
            : estado
              ? "Escanear otro QR"
              : "Abrir lector QR"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 14,
    padding: 20,
    backgroundColor: Colors.light.backgroundElement,
  },
  title: {
    color: Colors.light.text,
    fontSize: 30,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  subtitle: {
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  cameraFrame: {
    height: 280,
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
  },
  cameraMessage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  bodyText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    fontFamily: Fonts.sans,
  },
  resultBox: {
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 5,
    backgroundColor: Colors.light.background,
  },
  successBox: { borderLeftColor: "#15803d" },
  errorBox: { borderLeftColor: "#b91c1c" },
  resultText: {
    color: Colors.light.text,
    fontWeight: "700",
    fontFamily: Fonts.sans,
  },
  button: {
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSelected,
  },
  disabled: { opacity: 0.6 },
  buttonText: {
    color: Colors.light.background,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
});
