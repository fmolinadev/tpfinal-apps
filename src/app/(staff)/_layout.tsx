import { Tabs } from "expo-router";
import { useEffect, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { getCurrentUserSession } from "@/persistencia/session";
import type { RolUsuario } from "@/tipos/usuario";

export default function StaffLayout() {
  const [rol, setRol] = useState<RolUsuario | null>(null);

  useEffect(() => {
    async function loadRole() {
      const user = await getCurrentUserSession();
      setRol(user?.rol ?? null);
    }

    loadRole();
  }, []);

  const screens =
    rol === "administrador"
      ? [
          { name: "inicio", label: "Inicio" },
          { name: "agenda", label: "Agenda" },
          { name: "escanear", label: "Escanear QR" },
          { name: "presente-ausente", label: "Asistencia" },
          { name: "bloqueos", label: "Bloqueos" },
          { name: "reservas-fijas", label: "Reservas fijas" },
          { name: "precios", label: "Precios" },
          { name: "perfil", label: "Perfil" },
        ]
      : [
          { name: "inicio", label: "Inicio" },
          { name: "agenda", label: "Agenda" },
          { name: "escanear", label: "Escanear QR" },
          { name: "presente-ausente", label: "Asistencia" },
          { name: "bloqueos", label: "Bloqueos" },
          { name: "perfil", label: "Perfil" },
        ];

  return (
    <AuthGuard allowedRoles={["encargado", "administrador"]}>
      <Tabs screenOptions={{ headerShown: false }}>
        {screens.map((screen) => (
          <Tabs.Screen
            key={screen.name}
            name={screen.name}
            options={{ title: screen.label }}
          />
        ))}
      </Tabs>
    </AuthGuard>
  );
}
