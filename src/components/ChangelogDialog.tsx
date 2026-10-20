"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";

import { dismissChangelogAction } from "@/lib/actions/changelog";

import { Markdown } from "./Markdown";
import { useT } from "./i18n/LocaleProvider";

export type ChangelogItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

/**
 * Aviso de novedades de la plataforma.
 *
 * Se muestra a cada cuenta de personal la próxima vez que entra si hay alguna
 * novedad que aún no ha leído. Al cerrarlo se registran todas como leídas y
 * no vuelven a aparecer hasta la siguiente publicación.
 */
export function ChangelogDialog({ items }: { items: ChangelogItem[] }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const dismissing = useRef(false);

  useEffect(() => {
    // Nada de desplazamiento de fondo mientras el aviso está abierto.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (dismissing.current) return;
    dismissing.current = true;
    startTransition(async () => {
      await dismissChangelogAction();
    });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
        className="animate-scale-in my-auto flex max-h-[85vh] w-full max-w-2xl flex-col border-2 border-line bg-surface shadow-[8px_8px_0_0_var(--color-line)]"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-line bg-paper px-5 py-4 sm:px-7">
          <div>
            <p className="micro">{t("changelog.novedadesDeLaPlataforma")}</p>
            <h2
              id="changelog-title"
              className="mt-1.5 font-display text-[22px] font-bold"
            >
              {items.length === 1 ? items[0].title : t("changelog.titulosN", { n: items.length })}
            </h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            disabled={pending}
            aria-label={t("changelog.cerrar")}
            className="flex size-9 shrink-0 items-center justify-center border-2 border-line bg-surface text-[16px] font-bold transition-colors hover:bg-paper disabled:opacity-60"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7 sm:py-5">
          {items.map((item, index) => (
            <article key={item.id} className={index > 0 ? "mt-7 border-t-2 border-hairline pt-6" : undefined}>
              {items.length > 1 ? (
                <h3 className="font-display text-[17px] font-bold">{item.title}</h3>
              ) : null}
              <Markdown>{item.body}</Markdown>
            </article>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 border-t-2 border-line bg-paper px-5 py-4 sm:px-7">
          <p className="text-[12px] text-ink-faint">{t("changelog.noVolveraASolamente")}</p>
          <button
            type="button"
            onClick={dismiss}
            disabled={pending}
            className="btn-primary shrink-0"
          >
            {pending ? t("changelog.cerrando") : t("changelog.entendido")}
          </button>
        </div>
      </div>
    </div>
  );
}
