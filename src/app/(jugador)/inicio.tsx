import {
    HomeDashboard,
    type DashboardItem,
} from "@/components/ui/home-dashboard";
import { PlayerOnboarding } from "@/components/player-onboarding";

const PLAYER_ITEMS: DashboardItem[] = [
  {
    title: "Espacios",
    description: "Conocé las canchas y complejos",
    href: "/(jugador)/espacios",
    icon: "courts",
  },
  {
    title: "Disponibilidad",
    description: "Encontrá un horario para jugar",
    href: "/(jugador)/disponibilidad",
    icon: "calendar",
  },
  {
    title: "Mis reservas",
    description: "Consultá tus próximos turnos",
    href: "/(jugador)/reservas",
    icon: "recurring",
  },
  {
    title: "Mapa",
    description: "Ubicá los espacios deportivos",
    href: "/(jugador)/mapa",
    icon: "map",
  },
];

export default function InicioScreen() {
  return (
    <>
      <HomeDashboard
        title="Hola"
        description="Explorá los espacios, elegí tu horario y organizá tu próximo partido."
        profileHref="/(jugador)/perfil"
        fallbackName="deportista"
        items={PLAYER_ITEMS}
      />
      <PlayerOnboarding />
    </>
  );
}
