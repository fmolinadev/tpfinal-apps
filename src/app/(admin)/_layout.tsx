import { Tabs } from "expo-router";

import { AuthGuard } from "@/components/auth-guard";
import { RoleTabIcon } from "@/components/ui/role-tab-icon";

export default function AdminLayout() {
  return (
    <AuthGuard allowedRoles={["administrador"]}>
      <Tabs backBehavior="fullHistory" safeAreaInsets={{ bottom: 0 }} screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="inicio"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color, size, focused }) => (
              <RoleTabIcon name="home" color={color} size={size} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color, size, focused }) => (
              <RoleTabIcon name="profile" color={color} size={size} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen name="agenda" options={{ title: "Agenda", tabBarItemStyle: { display: "none" } }} />
        <Tabs.Screen
          name="asistencia"
          options={{ title: "Asistencia", tabBarItemStyle: { display: "none" } }}
        />
        <Tabs.Screen
          name="inspecciones"
          options={{ title: "Inspecciones", tabBarItemStyle: { display: "none" } }}
        />
        <Tabs.Screen
          name="escaner"
          options={{ title: "Escáner QR", tabBarItemStyle: { display: "none" } }}
        />
        <Tabs.Screen
          name="precios"
          options={{ title: "Precios", tabBarItemStyle: { display: "none" } }}
        />
        <Tabs.Screen
          name="mantenimiento"
          options={{ title: "Mantenimiento", tabBarItemStyle: { display: "none" } }}
        />
        <Tabs.Screen
          name="reservas-fijas"
          options={{ title: "Reservas fijas", tabBarItemStyle: { display: "none" } }}
        />
      </Tabs>
    </AuthGuard>
  );
}
