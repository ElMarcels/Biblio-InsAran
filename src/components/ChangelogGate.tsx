import { getCurrentUser } from "@/lib/auth";
import { pendingChangelogs } from "@/lib/changelog";

import { ChangelogDialog } from "./ChangelogDialog";

/**
 * Muestra el aviso de novedades (una sola vez por publicación) a la cuenta
 * que acaba de entrar en la plataforma. Si no hay sesión o no queda nada por
 * leer, no renderiza nada.
 *
 * Va en el layout de la raíz para cubrir tanto el catálogo como el panel.
 */
export async function ChangelogGate() {
  const user = await getCurrentUser();
  if (!user) return null;

  const pending = await pendingChangelogs(user.id);
  if (pending.length === 0) return null;

  return (
    <ChangelogDialog
      items={pending.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }))}
    />
  );
}
