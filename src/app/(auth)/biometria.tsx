import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  finishBiometricLogin,
  getCurrentUserSession,
} from "@/persistencia/session";
import { isBiometricSupported, verificarContrasena } from "@/servicios/auth";
import type { Usuario } from "@/tipos/usuario";
import { rutaInicioPorRol } from "@/utilidades/rutas";

export default function BiometricScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [biometriaDisponible, setBiometriaDisponible] = useState(false);
  const [status, setStatus] = useState("Verificando sesión...");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verificandoPassword, setVerificandoPassword] = useState(false);

  useEffect(() => {
    let active = true;

    getCurrentUserSession()
      .then((usuarioActual) => {
        if (!active) {
          return;
        }

        if (!usuarioActual) {
          setStatus("No encontramos una sesión guardada.");
          setError("Ingresá con tu email y contraseña para continuar.");
          return;
        }

        setUsuario(usuarioActual);
        return isBiometricSupported()
          .then((disponible) => {
            if (!active) {
              return;
            }

            setBiometriaDisponible(disponible);
            if (!disponible) {
              setStatus(
                "La biometría no está disponible. Ingresá tu contraseña para continuar.",
              );
              return;
            }

            setStatus("Confirmá tu identidad con huella o reconocimiento facial.");
            return finishBiometricLogin().then((autenticado) => {
              if (!active) {
                return;
              }

              if (autenticado) {
                router.replace(rutaInicioPorRol(usuarioActual.rol));
              } else {
                setStatus(
                  "No se pudo verificar tu identidad. Podés continuar con tu contraseña.",
                );
              }
            });
          })
          .catch((errorBiometrico: unknown) => {
            if (active) {
              setStatus(
                errorBiometrico instanceof Error
                  ? errorBiometrico.message
                  : "No se pudo iniciar la autenticación biométrica. Podés ingresar con tu contraseña.",
              );
            }
          });
      })
      .catch((errorSesion: unknown) => {
        if (active) {
          setError(
            errorSesion instanceof Error
              ? errorSesion.message
              : "No se pudo restaurar la sesión.",
          );
          setStatus("Ingresá nuevamente para continuar.");
        }
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function ingresarConContrasena() {
    if (!usuario || !password || verificandoPassword) {
      setError(
        !usuario
          ? "Ingresá con tu email y contraseña."
          : "Ingresá tu contraseña para continuar.",
      );
      return;
    }

    setVerificandoPassword(true);
    setError(null);
    try {
      await verificarContrasena(usuario, password);
      router.replace(rutaInicioPorRol(usuario.rol));
    } catch (errorContrasena) {
      setError(
        errorContrasena instanceof Error
          ? errorContrasena.message
          : "No se pudo validar la contraseña.",
      );
    } finally {
      setVerificandoPassword(false);
    }
  }

  async function reintentarBiometria() {
    if (!usuario || verificandoPassword) {
      return;
    }

    setError(null);
    try {
      const autenticado = await finishBiometricLogin();
      if (autenticado) {
        router.replace(rutaInicioPorRol(usuario.rol));
      } else {
        setStatus("No se pudo verificar tu identidad. Probá con tu contraseña.");
      }
    } catch (errorBiometrico) {
      setStatus(
        errorBiometrico instanceof Error
          ? errorBiometrico.message
          : "No se pudo iniciar la autenticación biométrica.",
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Volver a ingresar</Text>
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {status}
        </Text>

        <Text style={styles.label}>Contraseña de {usuario?.email ?? "tu cuenta"}</Text>
        <TextInput
          value={password}
          onChangeText={(valor) => {
            setPassword(valor);
            setError(null);
          }}
          placeholder="Ingresá tu contraseña"
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void ingresarConContrasena()}
          style={styles.input}
          editable={!verificandoPassword}
        />

        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Pressable
          style={[
            styles.button,
            (!usuario || !password || verificandoPassword) &&
              styles.buttonDisabled,
          ]}
          onPress={() => void ingresarConContrasena()}
          disabled={!usuario || !password || verificandoPassword}
        >
          <Text style={styles.buttonText}>
            {verificandoPassword ? "Verificando..." : "Continuar con contraseña"}
          </Text>
        </Pressable>

        {biometriaDisponible && usuario ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => void reintentarBiometria()}
          >
            <Text style={styles.secondaryButtonText}>Reintentar biometría</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={styles.linkButton}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.linkText}>Ingresar con otra cuenta</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#eef2ff",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111827",
    textAlign: "center",
  },
  status: {
    fontSize: 16,
    textAlign: "center",
    color: "#475569",
    marginBottom: 20,
    lineHeight: 23,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#334155",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    color: "#111827",
  },
  error: {
    color: "#b42318",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#4338ca",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#4338ca",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: { color: "#4338ca", fontWeight: "700" },
  linkButton: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  linkText: { color: "#4338ca", fontWeight: "600" },
});
