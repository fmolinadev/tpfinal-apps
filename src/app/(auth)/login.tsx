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

import { Fonts } from "@/constants/theme";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";
import { loginUsuario } from "@/servicios/auth";
import {
  rutaInicioPorRol,
  rutaReservaPendiente,
} from "@/utilidades/rutas";

export default function LoginScreen() {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const router = useRouter();
  const parametros = useLocalSearchParams<{
    motivo?: string | string[];
    reservaEspacioId?: string | string[];
    reservaTurnoId?: string | string[];
  }>();
  const motivo = Array.isArray(parametros.motivo)
    ? parametros.motivo[0]
    : parametros.motivo;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorLogin, setErrorLogin] = useState<string | null>(null);
  const reservaEspacioId = obtenerParametro(parametros.reservaEspacioId);
  const reservaTurnoId = obtenerParametro(parametros.reservaTurnoId);

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

      const destinoReserva = rutaReservaPendiente(
        usuario.rol,
        reservaEspacioId,
        reservaTurnoId,
      );
      router.replace(destinoReserva ?? rutaInicioPorRol(usuario.rol));
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
          placeholderTextColor={palette.textSecondary}
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
          placeholderTextColor={palette.textSecondary}
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

        <Link
          href={{
            pathname: "/(auth)/registro",
            params: {
              reservaEspacioId: reservaEspacioId ?? "",
              reservaTurnoId: reservaTurnoId ?? "",
            },
          }}
          asChild
        >
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Crear cuenta</Text>
          </Pressable>
        </Link>

        <Link href="/(public)/consulta-disponibilidad" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Consultar disponibilidad sin cuenta</Text>
          </Pressable>
        </Link>
      </View>
    </View>
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
      flex: 1,
      justifyContent: "center",
      padding: 24,
      backgroundColor: palette.backgroundElement,
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
      textAlign: "center",
      fontWeight: "700",
      marginBottom: 20,
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
    buttonDisabled: { opacity: 0.6 },
    buttonText: {
      color: palette.textOnSelected,
      fontSize: 16,
      fontWeight: "700",
      fontFamily: Fonts.sans,
    },
    error: {
      color: palette.textSecondary,
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
      color: palette.textSecondary,
      fontWeight: "600",
      fontFamily: Fonts.sans,
    },
  });
}
