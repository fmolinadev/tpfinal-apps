import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { loginUsuario } from "@/servicios/auth";
import { rutaInicioPorRol } from "@/utilidades/rutas";

export default function LoginScreen() {
  const router = useRouter();
  const parametros = useLocalSearchParams<{ motivo?: string | string[] }>();
  const motivo = Array.isArray(parametros.motivo)
    ? parametros.motivo[0]
    : parametros.motivo;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorLogin, setErrorLogin] = useState<string | null>(null);

  const errorVisible =
    errorLogin ??
    (motivo === "sesion-expirada"
      ? "Tu sesión venció. Ingresá nuevamente para continuar."
      : null);

  async function handleLogin() {
    try {
      setLoading(true);
      setErrorLogin(null);
      const { token, usuario } = await loginUsuario({ email, password });
      if (!token) {
        throw new Error("No se generó una sesión válida.");
      }

      router.replace(rutaInicioPorRol(usuario.rol));
    } catch (error) {
      setErrorLogin(
        error instanceof Error ? error.message : "Ocurrió un error inesperado.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require("@/assets/images/logo_complejo_villaguay.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Iniciar sesión</Text>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          value={email}
          onChangeText={(valor) => {
            setEmail(valor);
            setErrorLogin(null);
          }}
          placeholder="Ingresá tu email"
          style={styles.input}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          value={password}
          onChangeText={(valor) => {
            setPassword(valor);
            setErrorLogin(null);
          }}
          onSubmitEditing={() => void handleLogin()}
          placeholder="Ingresá tu contraseña"
          secureTextEntry
          style={styles.input}
        />

        {errorVisible ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {errorVisible}
          </Text>
        ) : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading || !email.trim() || !password}
        >
          <Text style={styles.buttonText}>
            {loading ? "Ingresando..." : "Entrar"}
          </Text>
        </Pressable>

        <Link href="/(auth)/registro" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Crear cuenta</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#ebeaeb",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 220,
    height: 120,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    fontWeight: "700",
    marginBottom: 20,
    color: "#3b373a",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#3b373a",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9d3d7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#ffffff",
    color: "#3b373a",
  },
  button: {
    backgroundColor: "#a55890",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: "#b42318",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  linkButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 10,
  },
  linkText: {
    color: "#8f3c78",
    fontWeight: "600",
  },
});
