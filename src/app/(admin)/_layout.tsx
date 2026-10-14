import { Tabs } from "expo-router";

import { AuthGuard } from "@/components/auth-guard";

export default function AdminLayout() {
  return (
    <AuthGuard allowedRoles={["administrador"]}>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="inicio" options={{ title: "Inicio" }} />
        <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
        <Tabs.Screen name="agenda" options={{ title: "Agenda", href: null }} />
        <Tabs.Screen
          name="escaner"
          options={{ title: "Escáner QR", href: null }}
        />
        <Tabs.Screen
          name="precios"
          options={{ title: "Precios", href: null }}
        />
        <Tabs.Screen
          name="mantenimiento"
          options={{ title: "Mantenimiento", href: null }}
        />
        <Tabs.Screen
          name="reservas-fijas"
          options={{ title: "Reservas fijas", href: null }}
        />
      </Tabs>
    </AuthGuard>
  );
}
