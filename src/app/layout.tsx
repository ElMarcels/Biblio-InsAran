import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { ChangelogGate } from "@/components/ChangelogGate";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { SITE_NAME } from "@/lib/constants";
import { LOCALE_TAGS, OG_LOCALES } from "@/lib/i18n/config";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";
import { DARK_CLASS, THEME_INIT_SCRIPT } from "@/lib/theme";
import { getThemePreference } from "@/lib/theme-server";

import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display-family",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const body = Inter({
  variable: "--font-body-family",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const [locale, { messages, fallback }] = await Promise.all([
    getLocale(),
    getTranslations(),
  ]);
  const t = createTranslator(messages, fallback);
  const description = t("meta.description");

  return {
    title: {
      default: SITE_NAME,
      template: `%s · ${SITE_NAME}`,
    },
    description,
    openGraph: {
      type: "website",
      locale: OG_LOCALES[locale],
      siteName: SITE_NAME,
      title: SITE_NAME,
      description,
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1eee7" },
    { media: "(prefers-color-scheme: dark)", color: "#131318" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [{ locale, messages, fallback }, theme] = await Promise.all([
    getTranslations(),
    getThemePreference(),
  ]);
  const t = createTranslator(messages, fallback);

  return (
    <html
      lang={LOCALE_TAGS[locale]}
      className={`${display.variable} ${body.variable} ${mono.variable} h-full ${
        theme === "dark" ? DARK_CLASS : ""
      }`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {/* Antes del primer pintado: resuelve el tema del sistema. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <LocaleProvider locale={locale} messages={messages} fallback={fallback}>
          <a
            href="#contenido"
            className="absolute left-3 top-3 z-50 -translate-y-24 border-2 border-line bg-ink px-3 py-2 text-[13px] font-semibold text-paper transition-transform focus:translate-y-0"
          >
            {t("common.skipToContent")}
          </a>
          <SiteHeader />
          <main id="contenido" className="flex min-h-full flex-1 flex-col">
            {children}
          </main>
          <SiteFooter />
          <ChangelogGate />
        </LocaleProvider>
      </body>
    </html>
  );
}
