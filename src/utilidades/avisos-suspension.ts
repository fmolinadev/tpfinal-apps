type ReservaParaAviso = { id: string; estado: string };
export type EstadoAvisosSuspension = Record<string, string>;
export type CancelacionPorBloqueo = { reservaId: string; motivo: string };

function estaActiva(estado: string | undefined): boolean {
  return estado === "activa" || estado === "confirmada";
}

export async function reconciliarAvisosSuspension(
  anteriores: EstadoAvisosSuspension,
  actuales: readonly ReservaParaAviso[],
  obtenerMotivos: (reservaIds: string[]) => Promise<CancelacionPorBloqueo[]>,
  avisar: (reservaId: string, motivo: string) => Promise<boolean>,
  guardar: (estado: EstadoAvisosSuspension) => Promise<void>,
): Promise<void> {
  const transiciones = actuales.filter(
    (reserva) =>
      reserva.estado === "cancelada" && estaActiva(anteriores[reserva.id]),
  );
  if (transiciones.length > 0) await guardar(anteriores);
  const motivos = transiciones.length > 0
    ? new Map((await obtenerMotivos(transiciones.map((reserva) => reserva.id)))
      .map((item) => [item.reservaId, item.motivo]))
    : new Map<string, string>();
  const siguiente: EstadoAvisosSuspension = { ...anteriores };
  for (const reserva of actuales) {
    siguiente[reserva.id] = reserva.estado;
  }

  for (const reserva of transiciones) {
    const motivo = motivos.get(reserva.id);
    if (motivo === undefined) continue;
    siguiente[reserva.id] = anteriores[reserva.id];
  }
  await guardar(siguiente);

  for (const reserva of transiciones) {
    const motivo = motivos.get(reserva.id);
    if (motivo === undefined) continue;
    if (await avisar(reserva.id, motivo)) {
      siguiente[reserva.id] = reserva.estado;
      await guardar(siguiente);
    }
  }
}
