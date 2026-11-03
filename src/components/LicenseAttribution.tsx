/* eslint-disable @next/next/no-img-element */

const CC_ICONS = [
  "https://mirrors.creativecommons.org/presskit/icons/cc.svg",
  "https://mirrors.creativecommons.org/presskit/icons/by.svg",
  "https://mirrors.creativecommons.org/presskit/icons/nc.svg",
  "https://mirrors.creativecommons.org/presskit/icons/nd.svg",
];

const linkClass =
  "font-semibold underline decoration-line underline-offset-2 transition-colors hover:text-accent";

/**
 * Atribución de la licencia Creative Commons del proyecto.
 *
 * Se usa tanto en el pie de página como en el aviso que aparece al entrar.
 * El texto y los enlaces forman parte de la propia licencia, por eso no se
 * traducen.
 */
export function LicenseAttribution({ className }: { className?: string }) {
  return (
    <span className={className}>
      <a
        href="https://biblio-ins-aran.vercel.app/"
        className={linkClass}
        target="_blank"
        rel="noreferrer"
      >
        Biblioteca Institut d&apos;Aran
      </a>{" "}
      © 2026 by{" "}
      <a
        href="https://www.mnartv.es"
        className={linkClass}
        target="_blank"
        rel="noreferrer"
      >
        Marcel Nart Vilche
      </a>{" "}
      is licensed under{" "}
      <a
        href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
        className={linkClass}
        target="_blank"
        rel="noreferrer"
      >
        CC BY-NC-ND 4.0
      </a>
      {CC_ICONS.map((src) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          className="inline-block align-[-0.125em]"
          style={{ maxWidth: "1em", maxHeight: "1em", marginLeft: ".2em" }}
        />
      ))}
    </span>
  );
}
