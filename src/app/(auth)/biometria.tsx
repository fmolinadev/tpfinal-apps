import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import {
  finishBiometricLogin,
  getCurrentUserSession,
  getHomeRouteForUser,
} from "@/persistencia/session";

import { registrarDispositivoPush } from "@/servicios/notificaciones";

export default function BiometricScreen() {
  const router = useRouter();

  const [status, setStatus] = useState(
    "Verificando la sesión y el dispositivo...",
  );

  const [procesando, setProcesando] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function autenticar() {
      try {
        const usuario = await getCurrentUserSession();

        if (!usuario) {
          router.replace("/(tabs)");
          return;
        }

        if (mounted) {
          setStatus(
            "Autenticá tu identidad con el método de seguridad del dispositivo.",
          );
        }

        const autenticado = await finishBiometricLogin();

        if (!mounted) {
          return;
        }

        if (!autenticado) {
          setStatus(
            "No se pudo completar la autenticación. Podés ingresar nuevamente con tu email y contraseña.",
          );

          setProcesando(false);
          return;
        }

        // Solo los jugadores necesitan recibir avisos por bloqueos.
        // La autenticación no depende del registro push.
        if (usuario.rol === "jugador") {
          void registrarDispositivoPush();
        }

        router.replace(getHomeRouteForUser(usuario) as never);
      } catch (error) {
        console.error("Error de autenticación:", error);

        if (mounted) {
          setStatus(
            "No se pudo verificar tu identidad. Iniciá sesión nuevamente.",
          );

          setProcesando(false);
        }
      }
    }

    void autenticar();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Acceso seguro</Text>

        {procesando && (
          <ActivityIndicator
            size="large"
            color="#4338ca"
            style={styles.loader}
          />
        )}

        <Text style={styles.status}>{status}</Text>

        {!procesando && (
          <Pressable
            style={styles.button}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.buttonText}>
              Iniciar sesión con contraseña
            </Text>
          </Pressable>
        )}
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
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 18,
    color: "#111827",
  },
  loader: {
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    textAlign: "center",
    color: "#475569",
    marginBottom: 20,
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#4338ca",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
});