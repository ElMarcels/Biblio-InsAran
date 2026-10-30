import "server-only";

import { getCurrentUser } from "../auth";
import { getCurrentReader } from "../reader-auth";
import type { AssistantActor, AssistantScope } from "./types";

export class AssistantAuthError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "AssistantAuthError";
    this.status = status;
  }
}

/**
 * Decide la identidad real del asistente. El cliente solo puede pedir un
 * ámbito; el servidor lo baja a público si no hay sesión válida.
 *
 * El ámbito de personal NUNCA se concede desde el endpoint público: solo el
 * endpoint de `/api/panel/asistente` lo fuerza, y allí se exige cuenta activa.
 * Un miembro del personal que abra el orbe en el catálogo hablará como
 * visitante (o como lector si además tiene sesión de «Mi biblioteca»).
 */
export async function resolveActor(
  requested: AssistantScope,
  options: { staffOnly?: boolean } = {},
): Promise<AssistantActor> {
  if (options.staffOnly) {
    const user = await getCurrentUser();
    if (!user) {
      throw new AssistantAuthError(
        "El asistente del panel solo está disponible con una cuenta de personal.",
      );
    }
    return {
      scope: "STAFF",
      userId: user.id,
      userName: user.displayName,
      role: user.role,
    };
  }

  if (requested === "READER") {
    const reader = await getCurrentReader();
    if (reader) {
      return {
        scope: "READER",
        readerId: reader.id,
        readerName: reader.fullName,
      };
    }
  }

  return { scope: "PUBLIC" };
}

/** ¿La identidad puede tener historial guardado? */
export function canPersist(actor: AssistantActor): boolean {
  return actor.scope !== "PUBLIC";
}
