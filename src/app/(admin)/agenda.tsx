import { AgendaDia } from "@/components/agenda-dia";
import { AuthGuard } from "@/components/auth-guard";

const ROLES_ADMIN = ["administrador"] as const;

export default function AgendaAdminScreen() {
  return (
    <AuthGuard allowedRoles={ROLES_ADMIN}>
      <AgendaDia />
    </AuthGuard>
  );
}
