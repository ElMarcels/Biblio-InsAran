import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_NAME } from "@/lib/constants";

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

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Catálogo y gestión del fondo bibliográfico del instituto: consulta los libros disponibles y administra la colección.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="absolute left-3 top-3 z-50 -translate-y-24 border-2 border-line bg-ink px-3 py-2 text-[13px] font-semibold text-paper transition-transform focus:translate-y-0"
        >
          Saltar al contenido
        </a>
        <SiteHeader />
        <main id="contenido" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
