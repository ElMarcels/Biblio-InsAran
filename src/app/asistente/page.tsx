import Link from "next/link";

import { AssistantChat } from "@/components/assistant/AssistantChat";
import { isAssistantEnabled } from "@/lib/ai/config";
import { getT } from "@/lib/i18n/server";
import { getCurrentReader } from "@/lib/reader-auth";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("assistant.pageTitle") };
}

/**
 * Página completa del asistente. Aquí el personal no obtiene herramientas de
 * gestión: esas solo existen dentro de `/panel`, como exige el diseño.
 */
export default async function AssistantPage() {
  const [t, reader] = await Promise.all([getT(), getCurrentReader()]);

  if (!isAssistantEnabled()) {
    return (
      <div className="shell flex flex-1 flex-col gap-6 py-9">
        <header>
          <p className="micro mb-1.5">{t("assistant.name")}</p>
          <h1 className="font-display text-[30px] font-bold leading-tight">
            {t("assistant.pageTitle")}
          </h1>
        </header>
        <div className="card max-w-2xl p-6">
          <p className="text-[15px] leading-relaxed text-ink-soft">
            {t("assistant.notConfigured")}
          </p>
          <Link href="/catalogo" className="btn-outline btn-sm mt-5 inline-flex">
            {t("assistant.backToCatalog")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell flex flex-1 flex-col gap-6 py-9">
      <header className="animate-fade-in-up">
        <p className="micro mb-1.5">{t("assistant.name")}</p>
        <h1 className="font-display text-[30px] font-bold leading-tight">
          {t("assistant.pageTitle")}
        </h1>
        <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-soft">
          {t("assistant.pageIntro")}
        </p>
      </header>

      <div className="animate-fade-in-up">
        <AssistantChat
          scope={reader ? "READER" : "PUBLIC"}
          variant="page"
        />
      </div>
    </div>
  );
}
