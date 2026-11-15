const QUINCE_MINUTOS_MS = 15 * 60 * 1000;
const ZONA_API = "-03:00";

export function fechaHoraTurnoDesdeId(
  turnoId: string,
): { fecha: string; inicio: string } | null {
  const coincidencia =
    /^tur-(esp-[A-Za-z0-9_-]+)-(\d{4})(\d{2})(\d{2})-(\d{2})$/.exec(
      turnoId,
    );

  if (!coincidencia) return null;

  const [, , anio, mes, dia, hora] = coincidencia;
  const fecha = `${anio}-${mes}-${dia}`;
  const fechaUtc = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));

  if (
    fechaUtc.getUTCFullYear() !== Number(anio) ||
    fechaUtc.getUTCMonth() !== Number(mes) - 1 ||
    fechaUtc.getUTCDate() !== Number(dia) ||
    Number(hora) > 23
  ) {
    return null;
  }

  return { fecha, inicio: `${hora}:00` };
}

export function puedeMarcarAusente(
  fecha: string,
  inicio: string,
  ahora = Date.now(),
): boolean {
  const partesFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!partesFecha || !/^(?:[01]\d|2[0-3]):00$/.test(inicio)) {
    return false;
  }

  const [, anio, mes, dia] = partesFecha;
  const fechaUtc = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
  if (
    fechaUtc.getUTCFullYear() !== Number(anio) ||
    fechaUtc.getUTCMonth() !== Number(mes) - 1 ||
    fechaUtc.getUTCDate() !== Number(dia)
  ) {
    return false;
  }

  const inicioMs = Date.parse(`${fecha}T${inicio}:00${ZONA_API}`);
  return (
    Number.isFinite(inicioMs) &&
    ahora >= inicioMs + QUINCE_MINUTOS_MS
  );
}
