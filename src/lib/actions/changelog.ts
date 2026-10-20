"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { assertManager, assertUser, AuthError } from "../auth";
import { pendingChangelogs } from "../changelog";
import { recordAudit } from "../audit";
import { prisma } from "../prisma";
import {
  changelogSchema,
  fieldErrors,
  type ActionState,
} from "../validation";

const UNAUTHORIZED: ActionState = {
  status: "error",
  message: "actions.ownerOnly",
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateChangelog() {
  // El aviso vive en la raíz: se refresca para todas las rutas visitadas.
  revalidatePath("/", "layout");
  revalidatePath("/panel/changelog");
}

/**
 * Publica una novedad de la plataforma. Solo el dueño o una cuenta con rol
 * ADMIN pueden publicar (la comprobación se hace aquí, no en el formulario).
 */
export async function publishChangelogAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertManager();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  const parsed = changelogSchema.safeParse({
    title: text(formData, "title"),
    body: text(formData, "body"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const changelog = await prisma.changelog.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      createdById: user.id,
    },
  });

  // Quien publica ya la ha leído: no verá su propio aviso.
  await prisma.changelogView.create({
    data: { changelogId: changelog.id, userId: user.id },
  });

  await recordAudit({
    action: "CHANGELOG_PUBLISH",
    entityType: "Changelog",
    entityId: changelog.id,
    summary: `Novedad publicada: «${changelog.title}»`,
    userId: user.id,
  });

  revalidateChangelog();
  redirect("/panel/changelog?aviso=publicada");
}

/** Borra una novedad ya publicada (solo dueño o ADMIN). */
export async function deleteChangelogAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertManager();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  const id = text(formData, "id");
  if (!id) return { status: "error", message: "actions.changelogNoId" };

  const changelog = await prisma.changelog.findUnique({ where: { id } });
  if (!changelog) return { status: "error", message: "actions.changelogGone" };

  await prisma.changelog.delete({ where: { id } });
  await recordAudit({
    action: "CHANGELOG_DELETE",
    entityType: "Changelog",
    entityId: id,
    summary: `Novedad eliminada: «${changelog.title}»`,
    userId: user.id,
  });

  revalidateChangelog();
  return { status: "success", message: "actions.changelogDeleted" };
}

/**
 * Registra como leídas (para esta cuenta) todas las novedades pendientes.
 * Es lo que se invoca al cerrar el aviso: no volverán a aparecer.
 */
export async function dismissChangelogAction(): Promise<void> {
  const user = await assertUser();

  const pending = await pendingChangelogs(user.id);
  if (pending.length === 0) return;

  await prisma.changelogView.createMany({
    data: pending.map((item) => ({ changelogId: item.id, userId: user.id })),
    skipDuplicates: true,
  });

  revalidateChangelog();
}
