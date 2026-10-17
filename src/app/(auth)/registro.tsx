import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { registrarUsuario } from "@/servicios/auth";

export default function RegistroScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegistro() {
    try {
      setLoading(true);
      const { usuario } = await registrarUsuario({
        nombre,
        email,
        telefono,
        password,
      });
      Alert.alert("Registro exitoso", "Tu cuenta fue creada correctamente.");

      if (usuario.rol === "jugador") {
        router.replace("/(jugador)/inicio");
        return;
      }

      router.replace(
        usuario.rol === "administrador" ? "/(admin)/agenda" : "/(staff)/agenda",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la cuenta.";
      Alert.alert("Error en el registro", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image
          source={require("@/assets/images/logo_complejo_villaguay.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Crear cuenta</Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          style={styles.input}
          placeholder="Tu nombre"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholder="usuario@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          value={telefono}
          onChangeText={setTelefono}
          style={styles.input}
          placeholder="+54 9 11 1234 5678"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
        />

        <Pressable
          style={styles.button}
          onPress={handleRegistro}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creando cuenta..." : "Registrarme"}
          </Text>
        </Pressable>

        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Ya tengo cuenta</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 170,
    height: 80,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 18,
    color: "#0f172a",
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
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  linkButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 10,
  },
  linkText: {
    color: "#4338ca",
    fontWeight: "600",
  },
});
