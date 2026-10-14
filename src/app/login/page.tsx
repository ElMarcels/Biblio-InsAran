import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/LoginForm";
import { getCurrentUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";

export const metadata = { title: "Acceso" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/panel");

  const params = await searchParams;
  const rawNext = params.next;
  const next = Array.isArray(rawNext) ? rawNext[0] : rawNext;

  return (
    <div className="flex flex-1 items-stretch">
      <div className="shell grid flex-1 items-center gap-12 py-14 lg:grid-cols-2">
        <div className="hidden flex-col justify-center lg:flex">
          <p className="micro mb-5">Acceso restringido</p>
          <h1 className="max-w-[14ch] text-[54px] font-bold leading-[0.98]">
            El panel de la <span className="text-accent">biblioteca.</span>
          </h1>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ink-soft">
            La consulta del catálogo es pública. Para incorporar o editar
            títulos hace falta una cuenta que la dirección del centro haya
            creado previamente.
          </p>
          <ul className="mt-8 flex flex-col gap-3 text-[14px]">
            <li className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center border-2 border-line bg-paper text-[12px] font-bold">
                1
              </span>
              Entra con tu usuario y contraseña.
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center border-2 border-line bg-paper text-[12px] font-bold">
                2
              </span>
              Añade libros desde el panel.
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center border-2 border-line bg-paper text-[12px] font-bold">
                3
              </span>
              Aparecerán al instante en el catálogo.
            </li>
          </ul>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="border-2 border-line bg-surface p-7 shadow-[8px_8px_0_0_var(--color-line)] sm:p-9">
            <div className="mb-7">
              <p className="micro mb-2">{SITE_NAME}</p>
              <h2 className="font-display text-[30px] font-bold">Iniciar sesión</h2>
            </div>
            <LoginForm next={typeof next === "string" ? next : undefined} />
            <p className="mt-6 border-t border-hairline pt-5 text-[13px] text-ink-faint">
              ¿Necesitas una cuenta? Solo la dirección de la biblioteca puede
              crearlas desde su panel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
