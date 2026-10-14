import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

import {
  RoleTabIcon,
  type RoleTabIconName,
} from "@/components/ui/role-tab-icon";
import { Colors, Fonts } from "@/constants/theme";
import { getCurrentUserSession } from "@/persistencia/session";
import type { Usuario } from "@/tipos/usuario";

export type DashboardItem = {
  title: string;
  description: string;
  href: Href;
  icon: RoleTabIconName;
};

type HomeDashboardProps = {
  eyebrow: string;
  title: string;
  description: string;
  profileHref: Href;
  fallbackName: string;
  items: DashboardItem[];
};

function getInitials(name: string | undefined): string {
  if (!name?.trim()) return "VD";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("es-AR"))
    .join("");
}

function getFirstName(name: string | undefined, fallback: string): string {
  return name?.trim().split(/\s+/)[0] || fallback;
}

export function HomeDashboard({
  eyebrow,
  title,
  description,
  profileHref,
  fallbackName,
  items,
}: HomeDashboardProps) {
  const router = useRouter();
  const scheme = useColorScheme();
  const palette = Colors[scheme === "dark" ? "dark" : "light"];
  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: palette.backgroundElement },
        content: { paddingBottom: 28 },
        topBar: {
          minHeight: 72,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: palette.backgroundSelected,
        },
        topBarSide: { width: 44, alignItems: "flex-start" },
        logoWrap: {
          flex: 1,
          height: 48,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Colors.light.background,
          borderRadius: 12,
          marginHorizontal: 12,
        },
        logo: {
          width: 172,
          height: 40,
        },
        profileButton: {
          width: 42,
          height: 42,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.textSecondary,
        },
        profileInitials: {
          color: Colors.light.background,
          fontSize: 14,
          fontWeight: "900",
          fontFamily: Fonts.sans,
        },
        main: { paddingHorizontal: 20, paddingTop: 24, gap: 20 },
        intro: { gap: 6 },
        eyebrow: {
          color: palette.textSecondary,
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 1.25,
          fontFamily: Fonts.sans,
        },
        heading: {
          color: palette.text,
          fontSize: 28,
          lineHeight: 34,
          fontWeight: "900",
          letterSpacing: -0.5,
          fontFamily: Fonts.sans,
        },
        introText: {
          color: palette.textSecondary,
          fontSize: 14,
          lineHeight: 20,
          fontFamily: Fonts.sans,
        },
        sectionHeading: {
          color: palette.text,
          fontSize: 18,
          fontWeight: "800",
          marginBottom: -7,
          fontFamily: Fonts.sans,
        },
        grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
        card: {
          width: "47%",
          minHeight: 155,
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 14,
          paddingVertical: 18,
          borderRadius: 18,
          backgroundColor: palette.background,
          borderWidth: 1,
          borderColor: palette.backgroundElement,
          shadowColor: palette.text,
          shadowOpacity: 0.09,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 3,
        },
        cardPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
        iconWrap: {
          width: 56,
          height: 56,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.backgroundElement,
          marginBottom: 13,
        },
        cardTitle: {
          color: palette.text,
          fontSize: 16,
          lineHeight: 21,
          fontWeight: "800",
          textAlign: "center",
          fontFamily: Fonts.sans,
        },
        cardDescription: {
          color: palette.textSecondary,
          fontSize: 11,
          lineHeight: 16,
          textAlign: "center",
          marginTop: 4,
          fontFamily: Fonts.sans,
        },
        footer: {
          marginHorizontal: 20,
          padding: 15,
          borderRadius: 16,
          backgroundColor: palette.background,
          borderWidth: 1,
          borderColor: palette.backgroundElement,
        },
        footerText: {
          color: palette.textSecondary,
          fontSize: 12,
          lineHeight: 18,
          textAlign: "center",
          fontFamily: Fonts.sans,
        },
      }),
    [palette],
  );
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargarUsuario() {
      const usuarioActual = await getCurrentUserSession();
      if (activo) setUsuario(usuarioActual);
    }

    void cargarUsuario();

    return () => {
      activo = false;
    };
  }, []);

  const nombre = getFirstName(usuario?.nombre, fallbackName);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <View style={styles.topBarSide} />
        <View style={styles.logoWrap}>
          <Image
            source={require("@/assets/images/villaguay_logo.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Logo de Villaguay Deportes"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir mi perfil"
          onPress={() => router.push(profileHref)}
          style={styles.profileButton}
        >
          <Text style={styles.profileInitials}>
            {getInitials(usuario?.nombre)}
          </Text>
        </Pressable>
      </View>

      <View style={styles.main}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.heading}>
            {title}, {nombre}
          </Text>
          <Text style={styles.introText}>{description}</Text>
        </View>

        <Text style={styles.sectionHeading}>¿A dónde querés ir?</Text>

        <View style={styles.grid}>
          {items.map((item) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.description}`}
              onPress={() => router.push(item.href)}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.iconWrap}>
                <RoleTabIcon
                  name={item.icon}
                  color={palette.backgroundSelected}
                  size={30}
                  focused
                />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            También podés cambiar de sección desde la barra de navegación.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
