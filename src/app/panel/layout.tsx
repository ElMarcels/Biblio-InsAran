import { Suspense } from "react";

import { PanelNav } from "@/components/panel/PanelNav";
import { PanelNavList } from "@/components/panel/PanelNavList";
import { itemsForRole } from "@/components/panel/nav-items";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("panel.panel") };
}

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const [user, t] = await Promise.all([requireUser(), getT()]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b-2 border-line bg-surface">
        <div className="shell flex flex-col gap-5 py-6">
          <div className="flex animate-fade-in-up flex-wrap items-end justify-between gap-3">
            <div>
              <p className="micro mb-1.5">{t("panel.panelDeGestion")}</p>
              <h1 className="font-display text-[26px] font-bold">
                {user.displayName}
              </h1>
            </div>
            <span className="tag-muted animate-pop">
              {user.role === "OWNER"
                ? t("panel.duenoDeLaPlataforma")
                : user.role === "ADMIN"
                  ? t("panel.adminDeLaPlataforma")
                  : t("panel.editor")}
            </span>
          </div>

          <Suspense fallback={<PanelNavList items={itemsForRole(user.role)} />}>
            <PanelNav role={user.role} />
          </Suspense>
        </div>
      </div>

      <div className="shell flex-1 py-9">{children}</div>
    </div>
  );
}
