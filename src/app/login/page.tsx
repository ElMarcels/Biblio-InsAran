import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/LoginForm";
import { getCurrentUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("home.acceso") };
}

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
  const t = await getT();

  return (
    <div className="flex flex-1 items-stretch">
      <div className="shell grid flex-1 items-center gap-12 py-14 lg:grid-cols-2">
        <div className="hidden flex-col justify-center lg:flex">
          <p className="micro mb-5">{t("login.accesoRestringido")}</p>
          <h1 className="max-w-[14ch] text-[54px] font-bold leading-[0.98]">
            {t("login.elPanelDeLa")} <span className="text-accent">{t("login.biblioteca")}</span>
          </h1>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ink-soft">
            {t(
              "login.laConsultaDelCatalogoEsPublicaParaIncorporarOEditarTitulosHaceFa",
            )}
          </p>
          <ul className="mt-8 flex flex-col gap-3 text-[14px]">
            <li className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center border-2 border-line bg-paper text-[12px] font-bold">
                1
              </span>
              {t("login.entraConTuUsuarioYContrasena")}
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center border-2 border-line bg-paper text-[12px] font-bold">
                2
              </span>
              {t("login.anadeLibrosDesdeElPanel")}
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center border-2 border-line bg-paper text-[12px] font-bold">
                3
              </span>
              {t("login.apareceranAlInstanteEnElCatalogo")}
            </li>
          </ul>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="border-2 border-line bg-surface p-7 shadow-[8px_8px_0_0_var(--color-line)] sm:p-9">
            <div className="mb-7">
              <p className="micro mb-2">{SITE_NAME}</p>
              <h2 className="font-display text-[30px] font-bold">
                {t("login.iniciarSesion")}
              </h2>
            </div>
            <LoginForm next={typeof next === "string" ? next : undefined} />
            <p className="mt-6 border-t border-hairline pt-5 text-[13px] text-ink-faint">
              {t(
                "login.necesitasUnaCuentaSoloLaDireccionDeLaBibliotecaPuedeCrearlasDesd",
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
