"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  confirmReaderTwoFactorAction,
  confirmStaffTwoFactorAction,
  disableReaderTwoFactorAction,
  disableStaffTwoFactorAction,
  regenerateReaderRecoveryCodesAction,
  regenerateStaffRecoveryCodesAction,
  startReaderTwoFactorAction,
  startStaffTwoFactorAction,
} from "@/lib/actions/two-factor";
import type { TranslationKey } from "@/lib/i18n/translate";
import { initialActionState, type ActionState } from "@/lib/validation";

import { Notice } from "../Notice";
import { SubmitButton } from "../SubmitButton";
import { useT } from "../i18n/LocaleProvider";
import { Field, inputClass } from "../forms/Field";

type TwoFactorAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>;

function formatSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Panel de verificación en dos pasos para una cuenta (personal o lector/a).
 * Comparte la interfaz; solo cambian las acciones y el segundo dato de
 * confirmación (contraseña o PIN).
 */
export function TwoFactorSettings({
  scope,
  enabled,
  enabledAt,
}: {
  scope: "staff" | "reader";
  enabled: boolean;
  enabledAt: string | null;
}) {
  const t = useT();
  const router = useRouter();

  const actions: {
    start: TwoFactorAction;
    confirm: TwoFactorAction;
    disable: TwoFactorAction;
    regenerate: TwoFactorAction;
    credentialField: string;
    credentialLabel: TranslationKey;
    credentialAutoComplete: string;
  } =
    scope === "staff"
      ? {
          start: startStaffTwoFactorAction,
          confirm: confirmStaffTwoFactorAction,
          disable: disableStaffTwoFactorAction,
          regenerate: regenerateStaffRecoveryCodesAction,
          credentialField: "currentPassword",
          credentialLabel: "panel.account.contrasenaActual",
          credentialAutoComplete: "current-password",
        }
      : {
          start: startReaderTwoFactorAction,
          confirm: confirmReaderTwoFactorAction,
          disable: disableReaderTwoFactorAction,
          regenerate: regenerateReaderRecoveryCodesAction,
          credentialField: "currentPin",
          credentialLabel: "reader.currentPin",
          credentialAutoComplete: "current-password",
        };

  const [startState, startAction] = useActionState(actions.start, initialActionState);
  const [confirmState, confirmAction] = useActionState(
    actions.confirm,
    initialActionState,
  );
  const [disableState, disableAction] = useActionState(
    actions.disable,
    initialActionState,
  );
  const [regenState, regenAction] = useActionState(
    actions.regenerate,
    initialActionState,
  );

  const [dismissedSetupSecret, setDismissedSetupSecret] = useState<string | null>(null);
  const [codesDismissedKey, setCodesDismissedKey] = useState<string | null>(null);
  const [codesSource, setCodesSource] = useState<"confirm" | "regen">("confirm");

  // Al desactivar, la cuenta cambia en el servidor: refrescamos los datos.
  useEffect(() => {
    if (disableState.status === "success") router.refresh();
  }, [disableState.status, router]);

  const setup = startState.twoFactorSetup;
  const recoveryCodes =
    codesSource === "regen"
      ? (regenState.recoveryCodes ?? null)
      : (confirmState.recoveryCodes ?? null);
  const codesKey = recoveryCodes ? recoveryCodes.join("|") : null;
  const showSetup =
    Boolean(setup) &&
    setup!.secret !== dismissedSetupSecret &&
    !enabled &&
    confirmState.status !== "success";
  const showCodes = Boolean(codesKey) && codesKey !== codesDismissedKey;

  return (
    <div className="flex flex-col gap-5">
      {showCodes && recoveryCodes ? (
        <div className="border-2 border-accent bg-accent-soft p-4">
          <h4 className="font-display text-[16px] font-bold">
            {t("twoFactor.recoveryCodesTitle")}
          </h4>
          <p className="mt-1 text-[13px] text-ink-soft">
            {t("twoFactor.recoveryCodesLead")}
          </p>
          <ul className="mt-3 grid gap-1 font-mono text-[14px] font-semibold sm:grid-cols-2">
            {recoveryCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-outline mt-4"
            onClick={() => {
              setCodesDismissedKey(codesKey);
              router.refresh();
            }}
          >
            {t("twoFactor.recoveryCodesSaved")}
          </button>
        </div>
      ) : null}

      {enabled ? (
        <>
          <div>
            <p className="text-[14px] font-semibold">{t("twoFactor.enabled")}</p>
            <p className="mt-1 text-[13px] text-ink-faint">
              {enabledAt
                ? t("twoFactor.enabledSince", { date: enabledAt })
                : t("twoFactor.enabled")}
            </p>
          </div>

          <section className="border-t border-hairline pt-5">
            <h4 className="font-display text-[16px] font-bold">
              {t("twoFactor.regenerateTitle")}
            </h4>
            <p className="mt-1 mb-4 text-[13px] text-ink-faint">
              {t("twoFactor.regenerateLead")}
            </p>

            <form
              action={regenAction}
              className="flex flex-col gap-3"
              noValidate
              onSubmit={() => setCodesSource("regen")}
            >
              {regenState.status === "error" && regenState.message ? (
                <Notice tone="danger">
                  {t(regenState.message, regenState.messageParams)}
                </Notice>
              ) : null}
              {regenState.status === "success" && regenState.message ? (
                <Notice tone="success">
                  {t(regenState.message, regenState.messageParams)}
                </Notice>
              ) : null}

              <Field
                label={actions.credentialLabel}
                htmlFor="regen-credential"
                error={regenState.fieldErrors?.[actions.credentialField]}
                required
              >
                <input
                  id="regen-credential"
                  name={actions.credentialField}
                  type="password"
                  className={inputClass(
                    Boolean(regenState.fieldErrors?.[actions.credentialField]),
                  )}
                  autoComplete={actions.credentialAutoComplete}
                  required
                />
              </Field>

              <Field
                label="twoFactor.code"
                htmlFor="regen-code"
                error={regenState.fieldErrors?.code}
                hint="twoFactor.codeHint"
                required
              >
                <input
                  id="regen-code"
                  name="code"
                  className={inputClass(Boolean(regenState.fieldErrors?.code))}
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  spellCheck={false}
                  required
                />
              </Field>

              <div>
                <SubmitButton pendingLabel="twoFactor.regenerating">
                  {t("twoFactor.regenerate")}
                </SubmitButton>
              </div>
            </form>
          </section>

          <section className="border-t border-hairline pt-5">
            <h4 className="font-display text-[16px] font-bold">
              {t("twoFactor.disableTitle")}
            </h4>
            <p className="mt-1 mb-4 text-[13px] text-ink-faint">
              {t("twoFactor.disableLead")}
            </p>

            <form
              action={disableAction}
              className="flex flex-col gap-3"
              noValidate
              onSubmit={() => setCodesDismissedKey(codesKey)}
            >
              {disableState.status === "error" && disableState.message ? (
                <Notice tone="danger">
                  {t(disableState.message, disableState.messageParams)}
                </Notice>
              ) : null}
              {disableState.status === "success" && disableState.message ? (
                <Notice tone="success">
                  {t(disableState.message, disableState.messageParams)}
                </Notice>
              ) : null}

              <Field
                label={actions.credentialLabel}
                htmlFor="disable-credential"
                error={disableState.fieldErrors?.[actions.credentialField]}
                required
              >
                <input
                  id="disable-credential"
                  name={actions.credentialField}
                  type="password"
                  className={inputClass(
                    Boolean(disableState.fieldErrors?.[actions.credentialField]),
                  )}
                  autoComplete={actions.credentialAutoComplete}
                  required
                />
              </Field>

              <Field
                label="twoFactor.code"
                htmlFor="disable-code"
                error={disableState.fieldErrors?.code}
                hint="twoFactor.codeHint"
                required
              >
                <input
                  id="disable-code"
                  name="code"
                  className={inputClass(Boolean(disableState.fieldErrors?.code))}
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  spellCheck={false}
                  required
                />
              </Field>

              <div>
                <SubmitButton
                  className="btn-outline"
                  pendingLabel="twoFactor.disabling"
                >
                  {t("twoFactor.disable")}
                </SubmitButton>
              </div>
            </form>
          </section>
        </>
      ) : showSetup && setup ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[14px] font-semibold">{t("twoFactor.setupTitle")}</p>
            <p className="mt-1 text-[13px] text-ink-faint">
              {t("twoFactor.scanQr")}
            </p>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={setup.qrDataUrl}
            alt={t("twoFactor.qrAlt")}
            width={200}
            height={200}
            className="border border-hairline bg-white p-2"
          />

          <div>
            <p className="text-[13px] text-ink-faint">
              {t("twoFactor.manualKey")}
            </p>
            <code className="mt-1 block break-all font-mono text-[14px] font-semibold">
              {formatSecret(setup.secret)}
            </code>
          </div>

          <form
            action={confirmAction}
            className="flex flex-col gap-3"
            noValidate
            onSubmit={() => setCodesSource("confirm")}
          >
            {confirmState.status === "error" && confirmState.message ? (
              <Notice tone="danger">
                {t(confirmState.message, confirmState.messageParams)}
              </Notice>
            ) : null}

            <Field
              label="twoFactor.code"
              htmlFor="confirm-code"
              error={confirmState.fieldErrors?.code}
              hint="twoFactor.enterCode"
              required
            >
              <input
                id="confirm-code"
                name="code"
                className={inputClass(Boolean(confirmState.fieldErrors?.code))}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                required
              />
            </Field>

            <div className="flex flex-wrap gap-3">
              <SubmitButton pendingLabel="twoFactor.confirming">
                {t("twoFactor.confirm")}
              </SubmitButton>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setDismissedSetupSecret(setup.secret)}
              >
                {t("twoFactor.cancel")}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[14px] font-semibold">{t("twoFactor.disabled")}</p>
            <p className="mt-1 text-[13px] text-ink-faint">{t("twoFactor.lead")}</p>
          </div>

          {startState.status === "error" && startState.message ? (
            <Notice tone="danger">
              {t(startState.message, startState.messageParams)}
            </Notice>
          ) : null}

          <form action={startAction}>
            <SubmitButton pendingLabel="twoFactor.preparing">
              {t("twoFactor.setup")}
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
