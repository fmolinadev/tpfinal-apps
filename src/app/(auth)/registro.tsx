import { Link, useLocalSearchParams, useRouter } from "expo-router";
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

import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { registrarUsuario } from "@/servicios/auth";
import {
  rutaInicioPorRol,
  rutaReservaPendiente,
} from "@/utilidades/rutas";

export default function RegistroScreen() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const router = useRouter();
  const parametros = useLocalSearchParams<{
    reservaEspacioId?: string | string[];
    reservaTurnoId?: string | string[];
  }>();
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

      const destinoReserva = rutaReservaPendiente(
        usuario.rol,
        obtenerParametro(parametros.reservaEspacioId),
        obtenerParametro(parametros.reservaTurnoId),
      );
      router.replace(destinoReserva ?? rutaInicioPorRol(usuario.rol));
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
          placeholder="Ej.: María Pérez"
          placeholderTextColor={palette.textSecondary}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholder="usuario@email.com"
          placeholderTextColor={palette.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          value={telefono}
          onChangeText={setTelefono}
          style={styles.input}
          placeholder="+54 9 11 1234 5678"
          placeholderTextColor={palette.textSecondary}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="next"
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          placeholder="Creá una contraseña"
          placeholderTextColor={palette.textSecondary}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
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

        <Link
          href={{
            pathname: "/(auth)/login",
            params: {
              reservaEspacioId:
                obtenerParametro(parametros.reservaEspacioId) ?? "",
              reservaTurnoId:
                obtenerParametro(parametros.reservaTurnoId) ?? "",
            },
          }}
          asChild
        >
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Ya tengo cuenta</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

function obtenerParametro(
  valor: string | string[] | undefined,
): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 24,
      backgroundColor: palette.backgroundElement,
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
      backgroundColor: palette.background,
      borderRadius: 20,
      padding: 24,
      shadowColor: palette.text,
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 3,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 18,
      color: palette.text,
      fontFamily: Fonts.sans,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
      color: palette.text,
      fontFamily: Fonts.sans,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.backgroundElement,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 16,
      fontSize: 16,
      backgroundColor: palette.background,
      color: palette.text,
      fontFamily: Fonts.sans,
    },
    button: {
      backgroundColor: palette.backgroundSelected,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    buttonText: {
      color: palette.textOnSelected,
      fontSize: 16,
      fontWeight: "700",
      fontFamily: Fonts.sans,
    },
    linkButton: {
      marginTop: 16,
      alignItems: "center",
      paddingVertical: 10,
    },
    linkText: {
      color: palette.textSecondary,
      fontWeight: "600",
      fontFamily: Fonts.sans,
    },
  });
}
