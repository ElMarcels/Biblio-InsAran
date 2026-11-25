"use client";

import { useActionState } from "react";

import { updateAranIdeaStatusAction } from "@/lib/actions/aran";
import {
  ARAN_IDEA_STATUSES,
  initialActionState,
  type AranIdeaStatus,
} from "@/lib/validation";
import type { TranslationKey } from "@/lib/i18n/translate";

import { Notice } from "../Notice";
import { useT } from "../i18n/LocaleProvider";

const STATUS_LABELS: Record<AranIdeaStatus, TranslationKey> = {
  NEW: "panel.aran.status.NEW",
  REVIEWING: "panel.aran.status.REVIEWING",
  PLANNED: "panel.aran.status.PLANNED",
  REJECTED: "panel.aran.status.REJECTED",
  IMPLEMENTED: "panel.aran.status.IMPLEMENTED",
};

export function AranIdeaStatusForm({
  id,
  status,
}: {
  id: string;
  status: AranIdeaStatus;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    updateAranIdeaStatusAction,
    initialActionState,
  );

  return (
    <div className="flex flex-col items-start gap-2">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <label className="sr-only" htmlFor={`status-${id}`}>
          {t("panel.aran.status")}
        </label>
        <select
          id={`status-${id}`}
          name="status"
          defaultValue={status}
          className="input min-w-40"
        >
          {ARAN_IDEA_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(STATUS_LABELS[value])}
            </option>
          ))}
        </select>
        <button type="submit" disabled={pending} className="btn-outline btn-sm">
          {pending ? t("panel.aran.saving") : t("panel.aran.updateStatus")}
        </button>
      </form>
      {state.status === "error" && state.message ? (
        <Notice tone="danger">{t(state.message, state.messageParams)}</Notice>
      ) : null}
      {state.status === "success" && state.message ? (
        <Notice tone="success">{t(state.message, state.messageParams)}</Notice>
      ) : null}
    </div>
  );
}