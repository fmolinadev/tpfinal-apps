import { Tabs } from "expo-router";

import { AuthGuard } from "@/components/auth-guard";

export default function JugadorLayout() {
  return (
    <AuthGuard>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="inicio" options={{ title: "Inicio" }} />
        <Tabs.Screen name="espacios" options={{ title: "Espacios" }} />
        <Tabs.Screen name="reservas" options={{ title: "Reservas" }} />
        <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
      </Tabs>
    </AuthGuard>
  );
}
