"use client";

import { useActionState } from "react";

import { renewLoanAction, returnLoanAction } from "@/lib/actions/loans";
import { initialActionState } from "@/lib/validation";

import { useT } from "../i18n/LocaleProvider";

/** Marca un préstamo como devuelto. */
export function ReturnLoanButton({ loanId }: { loanId: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    returnLoanAction,
    initialActionState,
  );

  if (state.status === "success") {
    return <span className="text-[12px] font-semibold text-ok">{t("Devuelto")}</span>;
  }

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={loanId} />
      <button type="submit" disabled={pending} className="btn-outline btn-sm">
        {pending ? "…" : t("Devolver")}
      </button>
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message)}</span>
      ) : null}
    </form>
  );
}

/** Alarga la fecha de devolución. */
export function RenewLoanButton({
  loanId,
  days,
}: {
  loanId: string;
  days: number;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    renewLoanAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={loanId} />
      <input type="hidden" name="days" value={days} />
      <button type="submit" disabled={pending} className="btn-ghost btn-sm">
        {pending ? "…" : t("+{days} días", { days })}
      </button>
      {state.status === "success" && state.message ? (
        <span className="text-[12px] font-semibold text-ok">{t(state.message)}</span>
      ) : null}
      {state.status === "error" && state.message ? (
        <span className="error-text">{t(state.message)}</span>
      ) : null}
    </form>
  );
}
