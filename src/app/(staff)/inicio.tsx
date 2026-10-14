import { HomeDashboard, type DashboardItem } from "@/components/ui/home-dashboard";

const STAFF_ITEMS: DashboardItem[] = [
  {
    title: "Agenda",
    description: "Turnos y espacios del día",
    href: "/(staff)/agenda",
    icon: "calendar",
  },
  {
    title: "Escanear QR",
    description: "Validar el ingreso de una reserva",
    href: "/(staff)/escanear",
    icon: "scan",
  },
  {
    title: "Asistencia",
    description: "Registrar presentes y ausentes",
    href: "/(staff)/presente-ausente",
    icon: "attendance",
  },
  {
    title: "Bloqueos",
    description: "Informar un horario no disponible",
    href: "/(staff)/bloqueos",
    icon: "block",
  },
];

export default function StaffInicioScreen() {
  return (
    <HomeDashboard
      eyebrow="RECEPCIÓN DEPORTIVA"
      title="Hola"
      description="Accedé rápidamente a las herramientas de tu jornada."
      profileHref="/(staff)/perfil"
      fallbackName="equipo"
      items={STAFF_ITEMS}
    />
  );
}
