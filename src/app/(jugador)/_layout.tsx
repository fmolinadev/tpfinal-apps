import { Tabs } from "expo-router";

import { AuthGuard } from "@/components/auth-guard";

export default function JugadorLayout() {
  return (
    <AuthGuard allowedRoles={["jugador"]}>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="inicio" options={{ title: "Inicio" }} />
        <Tabs.Screen name="espacios" options={{ title: "Espacios" }} />
        <Tabs.Screen name="reservas" options={{ title: "Reservas" }} />
        <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
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
