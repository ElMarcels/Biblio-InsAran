"use client";

import { useActionState, useState } from "react";

import {
  deleteUserAction,
  resetUserPasswordAction,
  setUserActiveAction,
} from "@/lib/actions/users";
import { initialActionState } from "@/lib/validation";

function Feedback({ state }: { state: { status: string; message?: string } }) {
  if (!state.message) return null;
  const tone = state.status === "success" ? "text-ok" : "text-danger";
  return <p className={`text-[12px] font-medium ${tone}`}>{state.message}</p>;
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
            title={isSelf && active ? "No puedes desactivar tu propia cuenta" : undefined}
          >
            {active ? "Desactivar" : "Activar"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowReset((value) => !value)}
          className="btn-outline btn-sm"
          aria-expanded={showReset}
        >
          {showReset ? "Cerrar" : "Contraseña"}
        </button>

        {!isOwnerAccount && !isSelf ? (
          confirmDelete ? (
            <form action={deleteAction} className="inline-flex items-center gap-1.5">
              <input type="hidden" name="userId" value={userId} />
              <span className="text-[12px] font-semibold text-danger">¿Eliminar?</span>
              <button type="submit" disabled={deletePending} className="btn-danger btn-sm">
                {deletePending ? "…" : "Sí"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="btn-ghost btn-sm"
              >
                No
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn-outline btn-sm text-danger"
              aria-label={`Eliminar la cuenta ${username}`}
            >
              Eliminar
            </button>
          )
        ) : null}
      </div>

      {showReset ? (
        <form action={resetAction} className="flex flex-wrap items-center gap-1.5 border-2 border-line bg-paper p-2">
          <input type="hidden" name="userId" value={userId} />
          <label className="sr-only" htmlFor={`pwd-${userId}`}>
            Nueva contraseña para {username}
          </label>
          <input
            id={`pwd-${userId}`}
            name="newPassword"
            type="password"
            placeholder="Nueva contraseña"
            minLength={8}
            required
            className="input w-44 py-1.5 text-[13px]"
            autoComplete="new-password"
          />
          <button type="submit" disabled={resetPending} className="btn-primary btn-sm">
            {resetPending ? "…" : "Asignar"}
          </button>
        </form>
      ) : null}

      <Feedback state={toggleState} />
      <Feedback state={resetState} />
      <Feedback state={deleteState} />
    </div>
  );
}
