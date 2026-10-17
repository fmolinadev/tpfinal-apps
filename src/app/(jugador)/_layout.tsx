import { Tabs } from "expo-router";

import { AuthGuard } from "@/components/auth-guard";
import { RoleTabIcon } from "@/components/ui/role-tab-icon";

export default function JugadorLayout() {
  return (
    <AuthGuard allowedRoles={["jugador"]}>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="inicio" options={{ title: "Inicio" }} />
        <Tabs.Screen name="espacios" options={{ title: "Espacios" }} />
        <Tabs.Screen
          name="escanear"
          options={{
            title: "Acceso QR",
            tabBarIcon: ({ color, size, focused }) => (
              <RoleTabIcon
                name="scan"
                color={color}
                size={size}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen name="reservas" options={{ title: "Reservas" }} />
        <Tabs.Screen name="perfil" options={{ title: "Perfil", href: null }} />
        <Tabs.Screen
          name="disponibilidad/index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="disponibilidad/[id]"
          options={{
            title: "Disponibilidad",
            href: null,
          }}
        />
        <Tabs.Screen
          name="espacio/[id]"
          options={{ title: "Espacio", href: null }}
        />
        <Tabs.Screen
          name="reserva/[id]"
          options={{ title: "Reserva", href: null }}
        />
      </Tabs>
    </AuthGuard>
  );
}
