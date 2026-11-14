import { Tabs } from "expo-router";

import { AuthGuard } from "@/components/auth-guard";

const STAFF_SCREENS = [
  { name: "inicio", label: "Inicio" },
  { name: "agenda", label: "Agenda" },
  { name: "presente-ausente", label: "Asistencia" },
];

export default function StaffLayout() {
  return (
    <AuthGuard allowedRoles={["encargado", "administrador"]}>
      <Tabs screenOptions={{ headerShown: false }}>
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
