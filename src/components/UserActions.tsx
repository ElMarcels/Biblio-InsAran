"use client";

import { useActionState, useState } from "react";

import {
  deleteUserAction,
  resetUserPasswordAction,
  setUserActiveAction,
} from "@/lib/actions/users";
import type { Translator } from "@/lib/i18n/translate";
import { initialActionState, type ActionState } from "@/lib/validation";

import { useT } from "./i18n/LocaleProvider";

function Feedback({
  state,
  t,
}: {
  state: ActionState;
  t: Translator;
}) {
  if (!state.message) return null;
  const tone = state.status === "success" ? "text-ok" : "text-danger";
  return <p className={`text-[12px] font-medium ${tone}`}>{t(state.message, state.messageParams)}</p>;
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
                ? t("panel.users.noPuedesDesactivarTuPropiaCuenta")
                : undefined
            }
          >
            {active ? t("panel.users.desactivar") : t("panel.users.activar")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowReset((value) => !value)}
          className="btn-outline btn-sm"
          aria-expanded={showReset}
        >
          {showReset ? t("panel.users.cerrar") : t("panel.users.contrasena")}
        </button>

        {!isOwnerAccount && !isSelf ? (
          confirmDelete ? (
            <form action={deleteAction} className="inline-flex items-center gap-1.5">
              <input type="hidden" name="userId" value={userId} />
              <span className="text-[12px] font-semibold text-danger">
                {t("panel.users.eliminar")}
              </span>
              <button type="submit" disabled={deletePending} className="btn-danger btn-sm">
                {deletePending ? "…" : t("panel.users.si")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="btn-ghost btn-sm"
              >
                {t("panel.users.no")}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn-outline btn-sm text-danger"
              aria-label={t("panel.users.eliminarLaCuentaUser", { user: username })}
            >
              {t("panel.users.eliminar_2")}
            </button>
          )
        ) : null}
      </div>

      {showReset ? (
        <form action={resetAction} className="flex flex-wrap items-center gap-1.5 border-2 border-line bg-paper p-2">
          <input type="hidden" name="userId" value={userId} />
          <label className="sr-only" htmlFor={`pwd-${userId}`}>
            {t("panel.users.nuevaContrasenaParaUser", { user: username })}
          </label>
          <input
            id={`pwd-${userId}`}
            name="newPassword"
            type="password"
            placeholder={t("panel.users.nuevaContrasena")}
            minLength={8}
            required
            className="input w-44 py-1.5 text-[13px]"
            autoComplete="new-password"
          />
          <button type="submit" disabled={resetPending} className="btn-primary btn-sm">
            {resetPending ? "…" : t("panel.users.asignar")}
          </button>
        </form>
      ) : null}

      <Feedback state={toggleState} t={t} />
      <Feedback state={resetState} t={t} />
      <Feedback state={deleteState} t={t} />
    </div>
  );
}
