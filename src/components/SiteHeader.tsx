import Link from "next/link";

import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ScrollProgress } from "@/components/ScrollProgress";
import { logoutAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { SITE_INSTITUTION, SITE_SHORT } from "@/lib/constants";
import { getLocale, getT } from "@/lib/i18n/server";

export async function SiteHeader() {
  const [user, t, locale] = await Promise.all([
    getCurrentUser(),
    getT(),
    getLocale(),
  ]);

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className="sticky top-0 z-40 border-b-2 border-line bg-surface/95 backdrop-blur"
    >
      <div className="shell flex h-[60px] items-center gap-4">
        <Link
          href="/"
          className="flex items-baseline gap-2 transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <span className="font-display text-[20px] font-bold tracking-tight">
            {SITE_SHORT}
          </span>
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint sm:inline">
            {SITE_INSTITUTION}
          </span>
        </Link>

        <nav aria-label={t("nav.principal")} className="ml-auto flex items-center gap-1.5">
          <Link
            href="/catalogo"
            className="nav-link border-2 border-transparent px-3 py-1.5 text-[14px] font-semibold hover:border-line hover:bg-paper"
          >
            {t("nav.catalogo")}
          </Link>
          <Link
            href="/autores"
            className="nav-link hidden border-2 border-transparent px-3 py-1.5 text-[14px] font-semibold hover:border-line hover:bg-paper md:inline-flex"
          >
            {t("nav.autorias")}
          </Link>
          <Link
            href="/etiquetas"
            className="nav-link hidden border-2 border-transparent px-3 py-1.5 text-[14px] font-semibold hover:border-line hover:bg-paper md:inline-flex"
          >
            {t("nav.materias")}
          </Link>
          <Link
            href="/colecciones"
            className="nav-link border-2 border-transparent px-3 py-1.5 text-[14px] font-semibold hover:border-line hover:bg-paper"
          >
            {t("nav.colecciones")}
          </Link>

          {user ? (
            <>
              <Link
                href="/panel"
                className="nav-link border-2 border-transparent px-3 py-1.5 text-[14px] font-semibold hover:border-line hover:bg-paper"
              >
                {t("nav.panel")}
              </Link>
              <span
                className="mx-1 hidden items-center gap-2 border-2 border-line px-2.5 py-1 sm:flex"
                title={t("nav.sesionIniciadaComoUser", { user: user.username })}
              >
                <span className="micro leading-none">
                  {user.role === "OWNER"
                    ? t("nav.dueno")
                    : user.role === "ADMIN"
                      ? t("nav.admin")
                      : t("nav.editor")}
                </span>
                <span className="text-[13px] font-semibold">{user.displayName}</span>
              </span>
              <form action={logoutAction}>
                <button type="submit" className="btn-outline btn-sm">
                  {t("nav.salir")}
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-primary btn-sm">
              {t("nav.acceder")}
            </Link>
          )}
          <span className="ml-1.5 border-l-2 border-line pl-1.5">
            <LocaleSwitcher current={locale} />
          </span>
        </nav>
      </div>
      <ScrollProgress />
    </header>
  );
}
