"use client";

import Image from "next/image";
import { useState } from "react";

import { coverInitials, coverTheme } from "@/lib/cover";
import { classNames } from "@/lib/format";

type Size = "sm" | "md" | "lg";

const RATIO: Record<Size, string> = {
  sm: "aspect-[3/4]",
  md: "aspect-[3/4]",
  lg: "aspect-[3/4]",
};

const PADDING: Record<Size, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const INITIALS_SIZE: Record<Size, string> = {
  sm: "text-[38px]",
  md: "text-[58px]",
  lg: "text-[104px]",
};

const TITLE_SIZE: Record<Size, string> = {
  sm: "text-[13px] leading-[1.15]",
  md: "text-[15px] leading-[1.15]",
  lg: "text-[21px] leading-[1.1]",
};

/** Tamaños de la portada para el optimizador de imágenes. */
const SIZES: Record<Size, string> = {
  sm: "140px",
  md: "(min-width: 640px) 240px, 45vw",
  lg: "(min-width: 1024px) 360px, 60vw",
};

/**
 * Portada del libro: la imagen real si la tenemos (`src`) y, si no hay o falla,
 * una portada tipográfica generada a partir del título.
 * El color y la composición son estables para cada libro.
 */
export function BookCover({
  title,
  author,
  category,
  src,
  size = "md",
  className,
}: {
  title: string;
  author: string;
  category?: string;
  /** URL de la portada (Open Library u otro host autorizado). */
  src?: string | null;
  size?: Size;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const theme = coverTheme(title);
  const initials = coverInitials(title) || "·";
  const showImage = Boolean(src) && !failed;

  return (
    <div
      aria-hidden="true"
      className={classNames(
        "relative flex flex-col justify-between overflow-hidden border-2 border-line font-display",
        RATIO[size],
        PADDING[size],
        className,
      )}
      style={
        showImage ? undefined : { backgroundColor: theme.background, color: theme.foreground }
      }
    >
      {showImage ? (
        <Image
          src={src!}
          alt=""
          fill
          sizes={SIZES[size]}
          className="object-cover transition-transform duration-500 ease-[var(--ease-out-quart)] group-hover:scale-[1.05]"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          {theme.variant === "spine" ? (
            <span
              className="absolute inset-y-0 left-0 w-[6px] transition-[width] duration-300 ease-[var(--ease-out-quart)] group-hover:w-[11px]"
              style={{ backgroundColor: theme.accent }}
            />
          ) : null}

          {theme.variant === "corner" ? (
            <span
              className={classNames(
                "pointer-events-none absolute -right-3 -bottom-6 font-bold opacity-25 transition-transform duration-500 ease-[var(--ease-out-quart)] group-hover:-translate-y-2",
                INITIALS_SIZE[size],
              )}
              style={{ color: theme.accent }}
            >
              {initials}
            </span>
          ) : null}

          <div className="relative flex items-start justify-between gap-2">
            {category ? (
              <span
                className="text-[9px] font-semibold uppercase tracking-[0.2em] opacity-80"
                style={{ color: theme.accent }}
              >
                {category}
              </span>
            ) : (
              <span />
            )}
            <span className="font-mono text-[9px] tracking-[0.2em] opacity-45">BIB</span>
          </div>

          {theme.variant === "stack" ? (
            <span
              className={classNames("relative font-bold", INITIALS_SIZE[size])}
              style={{ color: theme.accent }}
            >
              {initials}
            </span>
          ) : null}

          {theme.variant === "rule" ? (
            <span className="relative flex flex-col gap-3">
              <span
                className="block h-[6px] w-12 transition-[width] duration-300 ease-[var(--ease-out-quart)] group-hover:w-20"
                style={{ backgroundColor: theme.accent }}
              />
              <span className={classNames("font-semibold", TITLE_SIZE[size])}>{title}</span>
            </span>
          ) : null}

          {theme.variant === "corner" || theme.variant === "spine" ? (
            <span
              className={classNames("relative font-bold", INITIALS_SIZE[size])}
              style={{ color: theme.accent }}
            >
              {initials}
            </span>
          ) : null}

          <div
            className={classNames(
              "relative flex flex-col gap-0.5",
              theme.variant === "rule" && "mt-3",
            )}
          >
            {theme.variant !== "rule" ? (
              <span className={classNames("font-semibold", TITLE_SIZE[size])}>{title}</span>
            ) : null}
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] opacity-70">
              {author}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
