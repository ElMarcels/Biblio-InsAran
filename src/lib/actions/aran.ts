"use server";

import { revalidatePath } from "next/cache";

import { assertManager, assertUser, AuthError } from "../auth";
import { recordAudit } from "../audit";
import { prisma } from "../prisma";
import {
  ARAN_IDEA_STATUSES,
  aranIdeaSchema,
  fieldErrors,
  type ActionState,
  type AranIdeaStatus,
} from "../validation";

const UNAUTHORIZED: ActionState = {
  status: "error",
  message: "actions.sessionExpired",
};

const MANAGER_ONLY: ActionState = {
  status: "error",
  message: "actions.aranIdeaManagerOnly",
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createAranIdeaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertUser();
  } catch (error) {
    if (error instanceof AuthError) return UNAUTHORIZED;
    throw error;
  }

  const parsed = aranIdeaSchema.safeParse({
    title: text(formData, "title"),
    description: text(formData, "description"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "actions.reviewFieldsBeforeSave",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const idea = await prisma.aranIdea.create({
    data: { ...parsed.data, createdById: user.id },
  });
  await recordAudit({
    action: "ARAN_IDEA_CREATE",
    entityType: "AranIdea",
    entityId: idea.id,
    summary: `Idea para Aran enviada: «${idea.title}»`,
    userId: user.id,
  });

  revalidatePath("/panel/aran");
  revalidatePath("/panel/aran/ideas");
  return { status: "success", message: "panel.aran.ideaSubmitted" };
}

export async function updateAranIdeaStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertManager();
  } catch (error) {
    if (error instanceof AuthError) return MANAGER_ONLY;
    throw error;
  }

  const id = text(formData, "id").trim();
  const status = text(formData, "status");
  if (!id) return { status: "error", message: "actions.aranIdeaNoId" };
  if (!ARAN_IDEA_STATUSES.includes(status as AranIdeaStatus)) {
    return { status: "error", message: "actions.aranIdeaStatusInvalid" };
  }

  const idea = await prisma.aranIdea.findUnique({
    where: { id },
    select: { id: true, title: true, status: true },
  });
  if (!idea) return { status: "error", message: "actions.aranIdeaGone" };

  await prisma.aranIdea.update({ where: { id }, data: { status: status as AranIdeaStatus } });
  await recordAudit({
    action: "ARAN_IDEA_STATUS_UPDATE",
    entityType: "AranIdea",
    entityId: idea.id,
    summary: `Estado de idea de Aran actualizado: «${idea.title}»`,
    userId: user.id,
  });

  revalidatePath("/panel/aran/ideas");
  return { status: "success", message: "panel.aran.statusSaved" };
}