import "server-only";

import { prisma } from "./prisma";

/** Novedades de la plataforma que una cuenta aún no ha leído. */
export type PendingChangelog = {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
};

/**
 * Novedades publicadas que `userId` todavía no ha leído (de más reciente a
 * más antigua). Al cerrar el aviso se registran todas como leídas.
 */
export async function pendingChangelogs(userId: string): Promise<PendingChangelog[]> {
  return prisma.changelog.findMany({
    where: { views: { none: { userId } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, body: true, createdAt: true },
  });
}
