import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SpaceSelect } from "@/components/space-select";
import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { authenticateWithBiometrics, isBiometricSupported } from "@/servicios/auth";
import { getEspacios } from "@/servicios/espacios";
import {
  registrarIngreso,
  type IngresoRegistrado,
} from "@/servicios/ingresos";
import type { Espacio } from "@/tipos";

const ULTIMO_ESPACIO_INGRESO_KEY = "ultimo-espacio-ingreso";

type ScannerIngresoProps = {
  subtitulo: string;
};

export function ScannerIngreso({ subtitulo }: ScannerIngresoProps) {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const [permission, requestPermission] = useCameraPermissions();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioId, setEspacioId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [resultado, setResultado] = useState<IngresoRegistrado | null>(null);
  const [cargandoEspacios, setCargandoEspacios] = useState(true);
  const [autenticando, setAutenticando] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const procesandoRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function cargarEspacios() {
      try {
        const [respuesta, espacioGuardado] = await Promise.all([
          getEspacios(),
          Storage.getItem(ULTIMO_ESPACIO_INGRESO_KEY),
        ]);
        if (!active) return;

        if ("error" in respuesta) {
          throw new Error(
            respuesta.error?.mensaje ?? "No se pudieron cargar los espacios.",
          );
        }

        setEspacios(respuesta.datos);
        const idGuardado = espacioGuardado && respuesta.datos.some(
          (espacio) => espacio.id === espacioGuardado,
        )
          ? espacioGuardado
          : respuesta.datos[0]?.id ?? "";
        setEspacioId(idGuardado);
      } catch (error) {
        if (active) {
          setMensaje(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los espacios.",
          );
        }
      } finally {
        if (active) setCargandoEspacios(false);
      }
    }

    void cargarEspacios();
    return () => {
      active = false;
    };
  }, []);

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

  async function seleccionarEspacio(id: string) {
    setEspacioId(id);
    setMensaje(null);
    try {
      await Storage.setItem(ULTIMO_ESPACIO_INGRESO_KEY, id);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `Espacio seleccionado, pero no se pudo recordar: ${error.message}`
          : "Espacio seleccionado, pero no se pudo recordar.",
      );
    }
  }

  async function reautenticar(): Promise<boolean> {
    if (!(await isBiometricSupported())) {
      setMensaje(
        "Este dispositivo no tiene biometría configurada. No se puede habilitar el escáner.",
      );
      await reproducirFeedbackHaptico(false);
      return false;
    }

    setAutenticando(true);
    setMensaje(null);
    setResultado(null);
    try {
      const autenticada = await authenticateWithBiometrics({
        disableDeviceFallback: true,
      });
      if (!autenticada) {
        setMensaje("No se validó la biometría. La cámara sigue bloqueada.");
        await reproducirFeedbackHaptico(false);
        return false;
      }
      return true;
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo verificar la biometría.",
      );
      await reproducirFeedbackHaptico(false);
      return false;
    } finally {
      setAutenticando(false);
    }
  }

  async function registrarCodigo(codigoQr: string) {
    if (procesandoRef.current) return;
    const codigoNormalizado = codigoQr.trim();
    if (!espacioId) {
      setMensaje("Seleccioná el espacio donde se presenta el jugador.");
      await reproducirFeedbackHaptico(false);
      return;
    }
    if (!codigoNormalizado) {
      setMensaje("Ingresá o escaneá el código QR de la reserva.");
      await reproducirFeedbackHaptico(false);
      return;
    }
    if (!/^esp-[A-Za-z0-9_-]{1,36}$/.test(espacioId)) {
      setMensaje("El identificador del espacio seleccionado no es válido.");
      await reproducirFeedbackHaptico(false);
      return;
    }

    procesandoRef.current = true;
    setEscaneando(false);
    setRegistrando(true);
    setMensaje(null);
    setResultado(null);
    try {
      const ingreso = await registrarIngreso(codigoNormalizado, espacioId);
      setResultado(ingreso);
      setCodigo("");
      setMensaje("Ingreso registrado correctamente.");
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
    if (autenticando || registrando || escaneando) return;
    setResultado(null);
    if (!(await reautenticar())) return;

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

  async function registrarCodigoManual() {
    if (autenticando || registrando || !(await reautenticar())) return;
    await registrarCodigo(codigo);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>CONTROL DE INGRESO</Text>
      <Text style={styles.title}>Registrar ingreso</Text>
      <Text style={styles.subtitle}>{subtitulo}</Text>

      <Text style={styles.label}>Espacio</Text>
      <SpaceSelect
        spaces={espacios}
        selectedId={espacioId}
        onSelect={(id) => void seleccionarEspacio(id)}
        disabled={cargandoEspacios || registrando || escaneando}
        placeholder={
          cargandoEspacios ? "Cargando espacios..." : "Seleccioná un espacio"
        }
      />

      <View style={styles.scanBox}>
        {escaneando && permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => void registrarCodigo(data)}
          />
        ) : (
          <>
            <Text style={styles.scanIcon}>QR</Text>
            <Text style={styles.scanText}>
              {registrando
                ? "Registrando ingreso..."
                : escaneando
                  ? "Esperando permiso de cámara..."
                  : "La cámara requiere validación biométrica"}
            </Text>
          </>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        style={[
          styles.primaryButton,
          (autenticando || registrando || escaneando || !espacioId) &&
            styles.disabled,
        ]}
        disabled={
          autenticando || registrando || escaneando || !espacioId
        }
        onPress={() => void abrirCamara()}
      >
        {autenticando ? (
          <ActivityIndicator color={palette.textOnSelected} />
        ) : (
          <Text style={styles.primaryButtonText}>
            {escaneando ? "Escaneando..." : "Validar biometría y escanear"}
          </Text>
        )}
      </Pressable>

      {escaneando ? (
        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            setEscaneando(false);
            setMensaje("Escaneo cancelado.");
          }}
        >
          <Text style={styles.secondaryButtonText}>Cancelar escaneo</Text>
        </Pressable>
      ) : null}

      <Text style={styles.label}>O ingresá el código manualmente</Text>
      <TextInput
        value={codigo}
        onChangeText={setCodigo}
        placeholder="Código QR de la reserva"
        placeholderTextColor={palette.textSecondary}
        style={styles.input}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!registrando}
      />
      <Pressable
        style={[
          styles.secondaryButton,
          (registrando || autenticando || !espacioId) && styles.disabled,
        ]}
        disabled={registrando || autenticando || !espacioId}
        onPress={() => void registrarCodigoManual()}
      >
        <Text style={styles.secondaryButtonText}>
          {autenticando ? "Validando biometría..." : "Validar y registrar código"}
        </Text>
      </Pressable>

      {mensaje ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.result,
            resultado ? styles.successResult : styles.errorResult,
          ]}
        >
          <Text style={styles.resultText}>{mensaje}</Text>
          {resultado ? (
            <>
              <Text style={styles.resultDetail}>
                Jugador:{" "}
                {resultado.nombreJugador ??
                  `no disponible (${resultado.usuarioId})`}
              </Text>
              {resultado.errorNombreJugador ? (
                <Text style={styles.resultDetail}>
                  No se pudo consultar el nombre:{" "}
                  {resultado.errorNombreJugador}
                </Text>
              ) : null}
              <Text style={styles.resultDetail}>
                Reserva: {resultado.reservaId}
              </Text>
              <Text style={styles.resultDetail}>
                Turno: {resultado.turnoId}
              </Text>
              <Text style={styles.resultDetail}>
                Hora de ingreso:{" "}
                {new Date(resultado.ingresoEn).toLocaleString("es-AR")}
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.backgroundElement,
    },
    content: {
      padding: 20,
      paddingBottom: 36,
      gap: 14,
    },
    eyebrow: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.3,
      fontFamily: Fonts.sans,
    },
    title: {
      fontSize: 30,
      fontWeight: "800",
      color: palette.text,
      fontFamily: Fonts.sans,
    },
    subtitle: {
      color: palette.text,
      fontSize: 15,
      lineHeight: 21,
      fontFamily: Fonts.sans,
    },
    label: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      fontFamily: Fonts.sans,
    },
    scanBox: {
      height: 300,
      overflow: "hidden",
      borderRadius: 18,
      borderWidth: 2,
      borderColor: palette.backgroundSelected,
      backgroundColor: palette.background,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginVertical: 4,
    },
    scanIcon: {
      color: palette.backgroundSelected,
      fontSize: 42,
      fontWeight: "800",
      fontFamily: Fonts.mono,
    },
    scanText: {
      color: palette.text,
      fontWeight: "700",
      fontFamily: Fonts.sans,
      textAlign: "center",
    },
    input: {
      backgroundColor: palette.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      padding: 14,
      color: palette.text,
      fontFamily: Fonts.sans,
    },
    primaryButton: {
      backgroundColor: palette.backgroundSelected,
      borderRadius: 12,
      minHeight: 50,
      padding: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: palette.backgroundSelected,
      borderRadius: 12,
      padding: 14,
      alignItems: "center",
      backgroundColor: palette.background,
    },
    disabled: {
      opacity: 0.55,
    },
    primaryButtonText: {
      color: palette.textOnSelected,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    secondaryButtonText: {
      color: palette.textSecondary,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    result: {
      borderRadius: 12,
      padding: 14,
      gap: 6,
      borderLeftWidth: 5,
    },
    successResult: {
      backgroundColor: palette.background,
      borderLeftColor: palette.backgroundSelected,
    },
    errorResult: {
      backgroundColor: palette.background,
      borderLeftColor: palette.textSecondary,
    },
    resultText: {
      color: palette.text,
      fontWeight: "800",
      fontFamily: Fonts.sans,
    },
    resultDetail: {
      color: palette.text,
      fontFamily: Fonts.sans,
    },
  });
}
