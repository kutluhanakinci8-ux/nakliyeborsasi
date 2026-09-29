"use client";

import Link from "next/link";
import { ModulePageShell } from "../../../components/ModulePageShell";
import { IntegrationsFreightHubPanel } from "../../../components/integrations/IntegrationsFreightHubPanel";
import { IntegrationsMessagingHubPanel } from "../../../components/integrations/IntegrationsMessagingHubPanel";
import { useWebSession } from "../../../context/WebSessionProvider";
import { FREIGHT_PROVIDER_CODES } from "../../../lib/integrationsHubConfig";

export function IntegrationsPageClient() {
  const { accessToken, locale, session } = useWebSession();
  const isCompanyOwner = session?.roleCodes?.includes("COMPANY_OWNER") ?? false;

  return (
    <div className="integrations-center-premium">
      <ModulePageShell
        eyebrow="Entegrasyon merkezi"
        title="Bağlantılar, API ve harici yük"
        lead="Borsa adapterleri, firma sohbeti partner API'si ve webhook'lar tek premium hub'da. Operasyon ekibiniz için tek durak."
        action={
          <Link href="/hesap/uygulamalar" className="btn-secondary btn-secondary--light">
            Modül durumu
          </Link>
        }
        stats={[
          { value: String(FREIGHT_PROVIDER_CODES.length), label: "Yük adapteri" },
          { value: isCompanyOwner ? "Sahip" : "Üye", label: "API yetkisi" },
          { value: "FS-12", label: "Mesajlaşma kanalı", highlight: true },
        ]}
      >
        <IntegrationsMessagingHubPanel
          accessToken={accessToken}
          isCompanyOwner={isCompanyOwner}
        />
        <IntegrationsFreightHubPanel accessToken={accessToken} locale={locale} />
      </ModulePageShell>
    </div>
  );
}
