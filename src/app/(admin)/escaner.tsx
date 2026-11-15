import { AuthGuard } from "@/components/auth-guard";
import { ScannerIngreso } from "@/components/scanner-ingreso";

const ROLES_ADMIN = ["administrador"] as const;

export default function EscanerAdminScreen() {
  return (
    <AuthGuard allowedRoles={ROLES_ADMIN}>
      <ScannerIngreso subtitulo="Escaneá el QR de la reserva para registrar la llegada del jugador." />
    </AuthGuard>
  );
}
