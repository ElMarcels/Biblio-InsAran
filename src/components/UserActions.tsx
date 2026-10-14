"use client";

import { useActionState, useState } from "react";

import {
  deleteUserAction,
  resetUserPasswordAction,
  setUserActiveAction,
} from "@/lib/actions/users";
import { initialActionState } from "@/lib/validation";

import { useT } from "./i18n/LocaleProvider";

function Feedback({
  state,
  t,
}: {
  state: { status: string; message?: string };
  t: (source: string) => string;
}) {
  if (!state.message) return null;
  const tone = state.status === "success" ? "text-ok" : "text-danger";
  return <p className={`text-[12px] font-medium ${tone}`}>{t(state.message)}</p>;
}

export function UserActions({
  userId,
  username,
  active,
  isSelf,
  isOwnerAccount,
}: {
  userId: string;
  username: string;
  active: boolean;
  isSelf: boolean;
  isOwnerAccount: boolean;
}) {
  const t = useT();
  const [toggleState, toggleAction, togglePending] = useActionState(
    setUserActiveAction,
    initialActionState,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetUserPasswordAction,
    initialActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteUserAction,
    initialActionState,
  );
  const [showReset, setShowReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <form action={toggleAction}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="active" value={active ? "false" : "true"} />
          <button
            type="submit"
            disabled={togglePending || (isSelf && active)}
            className="btn-outline btn-sm"
            title={
              isSelf && active
                ? t("No puedes desactivar tu propia cuenta")
                : undefined
            }
          >
            {active ? t("Desactivar") : t("Activar")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowReset((value) => !value)}
          className="btn-outline btn-sm"
          aria-expanded={showReset}
        >
          {showReset ? t("Cerrar") : t("Contraseña")}
        </button>

        {!isOwnerAccount && !isSelf ? (
          confirmDelete ? (
            <form action={deleteAction} className="inline-flex items-center gap-1.5">
              <input type="hidden" name="userId" value={userId} />
              <span className="text-[12px] font-semibold text-danger">
                {t("¿Eliminar?")}
              </span>
              <button type="submit" disabled={deletePending} className="btn-danger btn-sm">
                {deletePending ? "…" : t("Sí")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="btn-ghost btn-sm"
              >
                {t("No")}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn-outline btn-sm text-danger"
              aria-label={t("Eliminar la cuenta {user}", { user: username })}
            >
              {t("Eliminar")}
            </button>
          )
        ) : null}
      </div>

      {showReset ? (
        <form action={resetAction} className="flex flex-wrap items-center gap-1.5 border-2 border-line bg-paper p-2">
          <input type="hidden" name="userId" value={userId} />
          <label className="sr-only" htmlFor={`pwd-${userId}`}>
            {t("Nueva contraseña para {user}", { user: username })}
          </label>
          <input
            id={`pwd-${userId}`}
            name="newPassword"
            type="password"
            placeholder={t("Nueva contraseña")}
            minLength={8}
            required
            className="input w-44 py-1.5 text-[13px]"
            autoComplete="new-password"
          />
          <button type="submit" disabled={resetPending} className="btn-primary btn-sm">
            {resetPending ? "…" : t("Asignar")}
          </button>
        </form>
      ) : null}

      <Feedback state={toggleState} t={t} />
      <Feedback state={resetState} t={t} />
      <Feedback state={deleteState} t={t} />
    </div>
  );
}
