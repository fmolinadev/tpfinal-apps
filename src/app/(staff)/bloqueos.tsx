import { AuthGuard } from "@/components/auth-guard";
import { GestionBloqueos } from "@/components/gestion-bloqueos";

const ROLES_PERSONAL = ["encargado", "administrador"] as const;

export default function BloqueosScreen() {
  return (
    <AuthGuard allowedRoles={ROLES_PERSONAL}>
      <GestionBloqueos />
    </AuthGuard>
  );
}
