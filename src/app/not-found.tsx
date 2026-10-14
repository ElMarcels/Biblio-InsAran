import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell flex flex-1 flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-[86px] font-bold leading-none text-accent">404</p>
      <h1 className="mt-4 font-display text-[30px] font-bold">
        No hemos encontrado esta página
      </h1>
      <p className="mt-3 max-w-md text-[15px] text-ink-soft">
        Puede que el enlace esté mal escrito o que el libro ya no esté en el
        catálogo.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        <Link href="/catalogo" className="btn-primary">
          Ir al catálogo
        </Link>
        <Link href="/" className="btn-outline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
