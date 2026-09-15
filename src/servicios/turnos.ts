import { reservasFijasMock, reservasMock } from "@/mocks/reservas";
import { mantenimientosMock, turnosMock } from "@/mocks/turnos";
import type { Mantenimiento, Turno } from "@/tipos/turno";
import { calcularTurnosDisponibles } from "@/utilidades/disponibilidad";

export async function obtenerTurnos(
  espacioId: string,
  fecha: string,
): Promise<Turno[]> {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const turnos = calcularTurnosDisponibles({
    espacioId,
    fecha,
    reservas: reservasMock,
    reservasFijas: reservasFijasMock,
    mantenimientos: mantenimientosMock,
  });

  return turnos.length ? turnos : turnosMock;
}

export async function obtenerMantenimientos(
  espacioId: string,
): Promise<Mantenimiento[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mantenimientosMock.filter(
    (mantenimiento) => mantenimiento.espacioId === espacioId,
  );
}
