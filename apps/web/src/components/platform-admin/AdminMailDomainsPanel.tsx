"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PlatformAdminApiClient,
  type MailDomainRow,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminMailDomainsPanel() {
  const { accessToken } = useWebSession();
  const [domains, setDomains] = useState<MailDomainRow[]>([]);
  const [orgId, setOrgId] = useState("");
  const [domain, setDomain] = useState("");
  const [localPart, setLocalPart] = useState("bildirim");
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const rows = await PlatformAdminApiClient.fetchMailDomains(accessToken);
      setDomains(rows);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createDomain(): Promise<void> {
    if (!accessToken || !orgId.trim() || !domain.trim()) {
      return;
    }
    await PlatformAdminApiClient.createMailDomain(accessToken, {
      organizationId: orgId.trim(),
      domain: domain.trim(),
      domainType: "custom",
    });
    setDomain("");
    await refresh();
  }

  async function verifyDomain(id: string): Promise<void> {
    if (!accessToken) {
      return;
    }
    await PlatformAdminApiClient.verifyMailDomain(accessToken, id);
    await refresh();
  }

  async function addSender(): Promise<void> {
    if (!accessToken || !selectedDomainId || !orgId.trim() || !localPart.trim()) {
      return;
    }
    await PlatformAdminApiClient.addMailSender(accessToken, selectedDomainId, {
      organizationId: orgId.trim(),
      localPart: localPart.trim(),
      displayName: "Kurumsal bildirim",
      isDefault: true,
    });
    await refresh();
  }

  return (
    <div className="pa-mail-domains">
      {loading ? <p className="module-hint">Domain listesi yükleniyor…</p> : null}

      <section className="pa-panel">
        <h2 className="pa-panel-title">Faz B — Kurumsal domain</h2>
        <p className="pa-panel-lead">
          Organizasyon UUID ve domain ekleyin. DNS doğrulandıktan sonra
          «Doğrula» ile transactional From aktif olur (outbox metadata.companyId).
        </p>
        <div className="pa-toolbar">
          <input
            className="pa-input"
            placeholder="Organizasyon UUID"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          />
          <input
            className="pa-input"
            placeholder="musteri.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <button
            type="button"
            className="pa-btn pa-btn--secondary"
            onClick={() => void createDomain()}
          >
            Domain ekle
          </button>
        </div>
      </section>

      <section className="pa-panel">
        <h2 className="pa-panel-title">Kayıtlı domainler</h2>
        <div className="admin-data-table-wrap">
          <table className="pa-outbox-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Org</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {domains.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code>{row.domain}</code>
                  </td>
                  <td style={{ fontSize: "0.72rem" }}>{row.organizationId}</td>
                  <td>{row.verificationStatus}</td>
                  <td>
                    <button
                      type="button"
                      className="pa-btn pa-btn--ghost"
                      style={{ fontSize: "0.75rem" }}
                      onClick={() => {
                        setSelectedDomainId(row.id);
                        void verifyDomain(row.id);
                      }}
                    >
                      Doğrula
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pa-panel">
        <h2 className="pa-panel-title">Varsayılan gönderen</h2>
        <div className="pa-toolbar">
          <input
            className="pa-input"
            placeholder="local-part (ör. bildirim)"
            value={localPart}
            onChange={(e) => setLocalPart(e.target.value)}
          />
          <button
            type="button"
            className="pa-btn pa-btn--secondary"
            onClick={() => void addSender()}
          >
            Kimlik ekle (seçili domain)
          </button>
        </div>
        <p className="module-hint">
          Önce tabloda domain seçin (Doğrula). Seçili domain id:{" "}
          {selectedDomainId || "—"}
        </p>
      </section>
    </div>
  );
}
