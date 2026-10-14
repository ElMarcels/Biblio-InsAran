import { setLocaleAction } from "@/lib/actions/locale";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/config";

/**
 * Selector de idioma. Es un formulario con un botón por idioma: cada uno
 * envía su código y el servidor guarda la preferencia en una cookie.
 */
export function LocaleSwitcher({ current }: { current: Locale }) {
  return (
    <form action={setLocaleAction} className="flex items-center gap-0.5">
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="submit"
            name="locale"
            value={locale}
            aria-current={active ? "true" : undefined}
            title={LOCALE_LABELS[locale]}
            className={
              active
                ? "border-2 border-line bg-ink px-2 py-1 font-mono text-[11px] font-semibold uppercase text-paper"
                : "border-2 border-transparent px-2 py-1 font-mono text-[11px] font-semibold uppercase text-ink-faint hover:border-line hover:text-ink"
            }
          >
            {locale}
          </button>
        );
      })}
    </form>
  );
}
