"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { dismissChangelogAction } from "@/lib/actions/changelog";

import { Markdown } from "./Markdown";
import { useT } from "./i18n/LocaleProvider";

export type ChangelogItem = {
  id: string;
  title: string;
  body: string;
  tourSteps: string | null;
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
  const tours = items.flatMap((item) => {
    const steps = item.tourSteps?.split(/\r?\n/).map((step) => step.trim()).filter(Boolean) ?? [];
    return steps.length > 0 ? [{ title: item.title, steps }] : [];
  });
  const [tourIndex, setTourIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const activeTour = tours[tourIndex];

  function previousTourStep() {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    } else if (tourIndex > 0) {
      const previousIndex = tourIndex - 1;
      setTourIndex(previousIndex);
      setStepIndex(tours[previousIndex].steps.length - 1);
    }
  }

  function nextTourStep() {
    if (!activeTour) return;
    if (stepIndex + 1 < activeTour.steps.length) {
      setStepIndex(stepIndex + 1);
    } else if (tourIndex + 1 < tours.length) {
      setTourIndex(tourIndex + 1);
      setStepIndex(0);
    } else {
      setTourIndex(tours.length);
    }
  }

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
          {tours.length > 0 ? (
            <section
              className="mt-7 border-2 border-line bg-paper p-5"
              aria-live="polite"
              aria-labelledby="changelog-tour-title"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="micro mb-1">AranOS · Tour</p>
                  <h3 id="changelog-tour-title" className="font-display text-[18px] font-bold">
                    {activeTour
                      ? t("changelog.tourFor", { title: activeTour.title })
                      : t("changelog.tourCompleted")}
                  </h3>
                </div>
                {activeTour ? (
                  <span className="tag-muted">
                    {t("changelog.tourProgress", {
                      current: stepIndex + 1,
                      total: activeTour.steps.length,
                    })}
                  </span>
                ) : null}
              </div>
              {activeTour ? (
                <>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
                    {activeTour.steps[stepIndex]}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={previousTourStep}
                      disabled={pending || (tourIndex === 0 && stepIndex === 0)}
                      className="btn-outline btn-sm disabled:opacity-50"
                    >
                      {t("common.anterior")}
                    </button>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setTourIndex(tours.length)}
                        disabled={pending}
                        className="btn-outline btn-sm"
                      >
                        {t("changelog.skipTour")}
                      </button>
                      <button
                        type="button"
                        onClick={nextTourStep}
                        disabled={pending}
                        className="btn-primary btn-sm"
                      >
                        {tourIndex + 1 < tours.length || stepIndex + 1 < activeTour.steps.length
                          ? t("common.siguiente")
                          : t("changelog.finishTour")}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-[13px] text-ink-soft">
                  {t("changelog.tourCompletedDescription")}
                </p>
              )}
            </section>
          ) : null}
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
