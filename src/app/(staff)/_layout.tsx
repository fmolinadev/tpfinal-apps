import { Tabs } from "expo-router";

import { AuthGuard } from "@/components/auth-guard";
import { RoleTabIcon } from "@/components/ui/role-tab-icon";

const STAFF_SCREENS = [
  { name: "agenda", label: "Agenda", icon: "calendar" },
  { name: "presente-ausente", label: "Asistencia", icon: "attendance" },
] as const;

export default function StaffLayout() {
  return (
    <AuthGuard allowedRoles={["encargado", "administrador"]}>
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
        {STAFF_SCREENS.map((screen) => (
          <Tabs.Screen
            key={screen.name}
            name={screen.name}
            options={{
              title: screen.label,
              tabBarIcon: ({ color, size, focused }) => (
                <RoleTabIcon name={screen.icon} color={color} size={size} focused={focused} />
              ),
            }}
          />
        ))}
        <Tabs.Screen name="perfil" options={{ tabBarItemStyle: { display: "none" } }} />
        <Tabs.Screen name="mantenimiento" options={{ tabBarItemStyle: { display: "none" } }} />
        <Tabs.Screen name="bloqueos" options={{ tabBarItemStyle: { display: "none" } }} />
        <Tabs.Screen name="escanear" options={{ tabBarItemStyle: { display: "none" } }} />
      </Tabs>
    </AuthGuard>
  );
}
