"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { logoutAction } from "@/lib/actions/auth";
import { SITE_INSTITUTION, SITE_SHORT } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/config";
import type { ThemePreference } from "@/lib/theme";

import { useT } from "./i18n/LocaleProvider";

type UserShape = {
  username: string;
  displayName: string;
  role: string;
} | null;

/**
 * Encabezado con navegación responsive.
 * En pantallas pequeñas muestra un botón hamburguesa que abre un panel
 * con todos los enlaces; en escritorio muestra la barra horizontal completa.
 */
export function SiteHeader({
  initialUser,
  initialLocale,
  initialTheme,
}: {
  initialUser: UserShape;
  initialLocale: Locale;
  initialTheme: ThemePreference;
}) {
  const t = useT();
  const [user] = useState<UserShape>(initialUser);
  const [locale] = useState<Locale>(initialLocale);
  const [theme] = useState(initialTheme);
  const [menuOpen, setMenuOpen] = useState(false);

  // Cerrar menú al redimensionar hacia escritorio
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Bloquear scroll del body cuando el menú está abierto
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const roleLabel =
    user?.role === "OWNER"
      ? t("nav.dueno")
      : user?.role === "ADMIN"
        ? t("nav.admin")
        : t("nav.editor");

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

        {/* Navegación de escritorio */}
        <nav aria-label={t("nav.principal")} className="ml-auto hidden items-center gap-1.5 md:flex">
          <NavLink href="/catalogo">{t("nav.catalogo")}</NavLink>
          <NavLink href="/autores">{t("nav.autorias")}</NavLink>
          <NavLink href="/etiquetas">{t("nav.materias")}</NavLink>
          <NavLink href="/colecciones">{t("nav.colecciones")}</NavLink>
          <NavLink href="/mi-biblioteca">{t("nav.miBiblioteca")}</NavLink>

          {user ? (
            <>
              <NavLink href="/panel">{t("nav.panel")}</NavLink>
              <span
                className="mx-1 hidden items-center gap-2 border-2 border-line px-2.5 py-1 lg:flex"
                title={t("nav.sesionIniciadaComoUser", { user: user.username })}
              >
                <span className="micro leading-none">{roleLabel}</span>
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
          <span className="ml-1.5 flex items-center gap-1 border-l-2 border-line pl-1.5">
            <ThemeToggle initial={theme} />
            <LocaleSwitcher current={locale} />
          </span>
        </nav>

        {/* Botón hamburguesa — solo móvil */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Cerrar menú" : t("nav.principal")}
          aria-expanded={menuOpen}
          className="ml-auto flex items-center justify-center rounded p-1.5 hover:bg-base-200 md:hidden"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={menuOpen ? "rotate-45" : ""}
          >
            <path d="M3 12h18M3 6h18" className={menuOpen ? "opacity-0" : ""} />
            <path d="M3 18h18" className={menuOpen ? "opacity-0" : ""} />
            <path d="M12 3v18" className={!menuOpen ? "opacity-0" : ""} />
          </svg>
        </button>
      </div>

      {/* Panel móvil */}
      {menuOpen && (
        <div className="fixed inset-0 top-[60px] z-50 md:hidden">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            aria-label={t("nav.principal")}
            className="relative mx-auto flex max-w-lg flex-col gap-1 border-t-2 border-line bg-surface px-5 py-5 shadow-2xl"
          >
            <MobileNavLink href="/catalogo" onClick={() => setMenuOpen(false)}>{t("nav.catalogo")}</MobileNavLink>
            <MobileNavLink href="/autores" onClick={() => setMenuOpen(false)}>{t("nav.autorias")}</MobileNavLink>
            <MobileNavLink href="/etiquetas" onClick={() => setMenuOpen(false)}>{t("nav.materias")}</MobileNavLink>
            <MobileNavLink href="/colecciones" onClick={() => setMenuOpen(false)}>{t("nav.colecciones")}</MobileNavLink>
            <MobileNavLink href="/mi-biblioteca" onClick={() => setMenuOpen(false)}>{t("nav.miBiblioteca")}</MobileNavLink>

            {user ? (
              <>
                <MobileNavLink href="/panel" onClick={() => setMenuOpen(false)}>{t("nav.panel")}</MobileNavLink>
                <div className="mx-1 flex items-center gap-2 border-2 border-line px-3 py-2">
                  <span className="micro leading-none">{roleLabel}</span>
                  <span className="text-[14px] font-semibold">{user.displayName}</span>
                </div>
                <form action={logoutAction} onSubmit={() => setMenuOpen(false)}>
                  <button type="submit" className="btn-outline btn-sm w-full">
                    {t("nav.salir")}
                  </button>
                </form>
              </>
            ) : (
              <div className="pt-1">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="btn-primary w-full"
                >
                  {t("nav.acceder")}
                </Link>
              </div>
            )}

            <div className="mt-3 flex items-center justify-center gap-3 border-t-2 border-line pt-4">
              <ThemeToggle initial={theme} />
              <LocaleSwitcher current={locale} />
            </div>
          </nav>
        </div>
      )}

      <ScrollProgress />
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="nav-link border-2 border-transparent px-3 py-1.5 text-[14px] font-semibold hover:border-line hover:bg-paper"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="border-2 border-line bg-paper px-4 py-3 text-[16px] font-semibold transition-colors duration-150 hover:bg-ink hover:text-paper"
    >
      {children}
    </Link>
  );
}
