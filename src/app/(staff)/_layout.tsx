import { Tabs } from "expo-router";

import { AuthGuard } from "@/components/auth-guard";
import { RoleTabIcon } from "@/components/ui/role-tab-icon";

const STAFF_SCREENS = [
  { name: "agenda", label: "Agenda" },
  { name: "presente-ausente", label: "Asistencia" },
];

export default function StaffLayout() {
  return (
    <AuthGuard allowedRoles={["encargado", "administrador"]}>
      <Tabs screenOptions={{ headerShown: false }}>
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
            options={{ title: screen.label }}
          />
        ))}
        <Tabs.Screen name="perfil" options={{ href: null }} />
        <Tabs.Screen name="mantenimiento" options={{ href: null }} />
        <Tabs.Screen name="bloqueos" options={{ href: null }} />
        <Tabs.Screen name="escanear" options={{ href: null }} />
      </Tabs>
    </AuthGuard>
  );
}
