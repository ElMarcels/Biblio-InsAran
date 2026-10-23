"use client";

import { useActionState } from "react";

import { useT } from "@/components/i18n/LocaleProvider";
import { deleteReviewAsStaffAction } from "@/lib/actions/reviews";
import { initialActionState } from "@/lib/validation";

export function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    deleteReviewAsStaffAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={reviewId} />
      <button
        type="submit"
        className="btn-ghost btn-sm text-danger"
        disabled={pending}
        onClick={(event) => {
          if (
            !window.confirm(t("panel.reviews.confirmarEliminar"))
          ) {
            event.preventDefault();
          }
        }}
      >
        {pending ? "…" : t("panel.reviews.eliminar")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message, state.messageParams)}</span>
      ) : null}
    </form>
  );
}
