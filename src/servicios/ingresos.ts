import { apiPost } from "@/servicios/api";

export async function registrarIngreso(
  codigoQr: string,
  espacioId: string,
): Promise<void> {
  await apiPost("/ingresos", { codigoQr, espacioId });
}
