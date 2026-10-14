import { HomeDashboard, type DashboardItem } from "@/components/ui/home-dashboard";

const ADMIN_ITEMS: DashboardItem[] = [
  {
    title: "Agenda",
    description: "Turnos y espacios del día",
    href: "/(admin)/agenda",
    icon: "calendar",
  },
  {
    title: "Escáner QR",
    description: "Validar ingresos en puerta",
    href: "/(admin)/escaner",
    icon: "scan",
  },
  {
    title: "Precios",
    description: "Editar tarifas por espacio",
    href: "/(admin)/precios",
    icon: "price",
  },
  {
    title: "Mantenimiento",
    description: "Gestionar bloqueos técnicos",
    href: "/(admin)/mantenimiento",
    icon: "maintenance",
  },
  {
    title: "Reservas fijas",
    description: "Administrar horarios recurrentes",
    href: "/(admin)/reservas-fijas",
    icon: "recurring",
  },
];

export default function InicioAdminScreen() {
  return (
    <HomeDashboard
      eyebrow="ADMINISTRACIÓN"
      title="Hola"
      description="Gestioná el complejo y sus espacios desde un solo lugar."
      profileHref="/(admin)/perfil"
      fallbackName="equipo"
      items={ADMIN_ITEMS}
    />
  );
}
