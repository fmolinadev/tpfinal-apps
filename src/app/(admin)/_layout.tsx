import { Tabs } from "expo-router";

import { AuthGuard } from "@/components/auth-guard";
import { RoleTabIcon } from "@/components/ui/role-tab-icon";

export default function AdminLayout() {
  return (
    <AuthGuard allowedRoles={["administrador"]}>
      <Tabs backBehavior="fullHistory" screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="inicio"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color, size, focused }) => (
              <RoleTabIcon name="home" color={color} size={size} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
        <Tabs.Screen name="agenda" options={{ title: "Agenda", href: null }} />
        <Tabs.Screen
          name="asistencia"
          options={{ title: "Asistencia", href: null }}
        />
        <Tabs.Screen
          name="inspecciones"
          options={{ title: "Inspecciones", href: null }}
        />
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
