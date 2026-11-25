"use client";

import { useActionState, useState } from "react";

import { deleteDigitalResourceAction } from "@/lib/actions/digital-resources";
import { initialActionState } from "@/lib/validation";

import { useT } from "../i18n/LocaleProvider";

export function DeleteDigitalResourceButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    deleteDigitalResourceAction,
    initialActionState,
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn-outline text-danger"
        aria-label={t("panel.digitalResources.deleteTitle", { title })}
      >
        {t("panel.digitalResources.delete")}
      </button>
    );
  }

  return (
    <form action={formAction} className="inline-flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <span className="text-[12px] font-semibold text-danger">
        {t("panel.digitalResources.confirmQuestion")}
      </span>
      <button
        type="submit"
        disabled={pending}
        className="btn-danger btn-sm"
        aria-label={t("panel.digitalResources.confirmDelete")}
      >
        {pending ? "…" : t("panel.digitalResources.yesDelete")}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="btn-ghost btn-sm"
        aria-label={t("panel.digitalResources.cancel")}
      >
        {t("panel.digitalResources.cancel")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
      {state.status === "success" && state.message ? (
        <span className="text-[12px] font-semibold text-ok">
          {t(state.message, state.messageParams)}
        </span>
      ) : null}
    </form>
  );
}