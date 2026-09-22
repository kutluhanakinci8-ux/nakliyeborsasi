"use client";

import { ModulePageShell } from "./ModulePageShell";

type AccountSectionPageProps = {
  title: string;
  lead: string;
};

export function AccountSectionPage({ title, lead }: AccountSectionPageProps) {
  return (
    <ModulePageShell eyebrow="Hesap" title={title} lead={lead}>
      <section className="module-panel module-panel--elevated">
        <p className="module-hint">
          Bu bölüm MVP aşamasında. Yakında firma bilgileri, yetkiler ve abonelik
          ayarları buradan yönetilecek.
        </p>
      </section>
    </ModulePageShell>
  );
}
