import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { loginUsuario } from "@/servicios/auth";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@tpfinal.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);
      const { token, usuario } = await loginUsuario({ email, password });
      if (!token) {
        throw new Error("No se generó una sesión válida.");
      }

      if (usuario.rol === "jugador") {
        router.replace("/(jugador)/inicio");
        return;
      }

      router.replace(
        usuario.rol === "administrador" ? "/(admin)/agenda" : "/(staff)/agenda",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ocurrió un error inesperado.";
      Alert.alert("Error de acceso", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require("@/assets/images/villaguay_logo.png")}
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
          value={email}
          onChangeText={setEmail}
          placeholder="usuario@email.com"
          style={styles.input}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          style={styles.input}
        />

        <Pressable
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
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
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
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
