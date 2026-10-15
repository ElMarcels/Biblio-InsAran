import Link from "next/link";

import { logoutAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { SITE_INSTITUTION, SITE_SHORT } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";

export async function SiteHeader() {
  const [user, t] = await Promise.all([getCurrentUser(), getT()]);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-line bg-surface/95 backdrop-blur">
      <div className="shell flex h-[60px] items-center gap-4">
        <Link
          href="/"
          className="flex items-baseline gap-2 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <span className="font-display text-[20px] font-bold tracking-tight">
            {SITE_SHORT}
          </span>
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint sm:inline">
            {SITE_INSTITUTION}
          </span>
        </Link>

        <nav aria-label="Principal" className="ml-auto flex items-center gap-1.5">
          <Link
            href="/catalogo"
            className="border-2 border-transparent px-3 py-1.5 text-[14px] font-semibold hover:border-line hover:bg-paper"
          >
            {t("Catálogo")}
          </Link>
          <Link
            href="/autores"
            className="hidden border-2 border-transparent px-3 py-1.5 text-[14px] font-semibold hover:border-line hover:bg-paper md:inline-flex"
          >
            {t("Autorías")}
          </Link>
          <Link
            href="/etiquetas"
            className="hidden border-2 border-transparent px-3 py-1.5 text-[14px] font-semibold hover:border-line hover:bg-paper md:inline-flex"
          >
            {t("Materias")}
          </Link>
          <Link
            href="/colecciones"
            className="border-2 border-transparent px-3 py-1.5 text-[14px] font-semibold hover:border-line hover:bg-paper"
          >
            {t("Colecciones")}
          </Link>

          {user ? (
            <>
              <Link
                href="/panel"
                className="border-2 border-transparent px-3 py-1.5 text-[14px] font-semibold hover:border-line hover:bg-paper"
              >
                {t("Panel")}
              </Link>
              <span
                className="mx-1 hidden items-center gap-2 border-2 border-line px-2.5 py-1 sm:flex"
                title={t("Sesión iniciada como {user}", { user: user.username })}
              >
                <span className="micro leading-none">
                  {user.role === "OWNER" ? t("Dueño") : t("Editor")}
                </span>
                <span className="text-[13px] font-semibold">{user.displayName}</span>
              </span>
              <form action={logoutAction}>
                <button type="submit" className="btn-outline btn-sm">
                  {t("Salir")}
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-primary btn-sm">
              {t("Acceder")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
