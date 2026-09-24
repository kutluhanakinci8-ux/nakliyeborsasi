"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PlatformAdminApiClient,
  type MailDomainRow,
  type TenantSubdomainPilotBundle,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

type CompanyOption = {
  id: string;
  legalName: string;
};

export function AdminMailDomainsPanel() {
  const { accessToken } = useWebSession();
  const [domains, setDomains] = useState<MailDomainRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [pilot, setPilot] = useState<TenantSubdomainPilotBundle | null>(null);
  const [orgId, setOrgId] = useState("");
  const [domain, setDomain] = useState("");
  const [localPart, setLocalPart] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const [rows, bundle, companyRows] = await Promise.all([
        PlatformAdminApiClient.fetchMailDomains(accessToken),
        PlatformAdminApiClient.fetchTenantSubdomainPilot(accessToken),
        PlatformAdminApiClient.fetchCompanies(accessToken),
      ]);
      setDomains(rows);
      setPilot(bundle);
      setCompanies(
        companyRows.map((c) => ({ id: c.id, legalName: c.legalName })),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const tenantDomain = pilot?.domain ?? "kullanici.lerta.tr";

  async function verifyTenantDns(): Promise<void> {
    if (!accessToken) {
      return;
    }
    setMessage("");
    try {
      await PlatformAdminApiClient.verifyTenantSubdomainDns(accessToken);
      setMessage("kullanici.lerta.tr DNS doğrulandı.");
      await refresh();
    } catch {
      setMessage("DNS henüz hazır değil — isimtescil TXT ve VPS OpenDKIM kontrol edin.");
      await refresh();
    }
  }

  async function provisionPilot(): Promise<void> {
    if (!accessToken || !orgId.trim() || !localPart.trim()) {
      return;
    }
    setMessage("");
    const result = await PlatformAdminApiClient.provisionTenantSubdomainSender(
      accessToken,
      {
        organizationId: orgId.trim(),
        localPart: localPart.trim(),
        displayName: displayName.trim() || undefined,
      },
    );
    setMessage(
      `Gönderen hazır: ${result.fromAddress} — Operasyon testinde org UUID: ${orgId.trim()}`,
    );
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("paFazBTestOrgId", orgId.trim());
    }
    await refresh();
  }

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

  async function verifyDomain(row: MailDomainRow): Promise<void> {
    if (!accessToken) {
      return;
    }
    setMessage("");
    if (row.domainType === "custom") {
      try {
        const result = await PlatformAdminApiClient.verifyMailDomainDns(
          accessToken,
          row.id,
        );
        setMessage(
          result.ok
            ? `${row.domain} DNS doğrulandı (SPF+DKIM).`
            : `${row.domain} DNS henüz eksik — SPF/DKIM kontrol edin.`,
        );
      } catch {
        setMessage(`${row.domain} DNS doğrulama başarısız.`);
      }
    } else {
      await PlatformAdminApiClient.verifyMailDomain(accessToken, row.id);
      setMessage(`${row.domain} manuel verified işaretlendi.`);
    }
    await refresh();
  }

  async function addSender(): Promise<void> {
    if (!accessToken || !selectedDomainId || !orgId.trim() || !localPart.trim()) {
      return;
    }
    await PlatformAdminApiClient.addMailSender(accessToken, selectedDomainId, {
      organizationId: orgId.trim(),
      localPart: localPart.trim(),
      displayName: displayName.trim() || "Kurumsal bildirim",
      isDefault: true,
    });
    await refresh();
  }

  return (
    <div className="pa-mail-domains">
      {loading ? <p className="module-hint">Yükleniyor…</p> : null}
      {message ? <p className="pa-panel-lead">{message}</p> : null}

      <section className="pa-panel">
        <h2 className="pa-panel-title">Faz B pilot — @{tenantDomain}</h2>
        <p className="pa-panel-lead">
          Paylaşımlı alt alan: her organizasyon için{" "}
          <code>slug@{tenantDomain}</code>. Outbox{" "}
          <code>metadata.companyId</code> ile From çözülür.
        </p>
        {pilot ? (
          <ul className="pa-kv-list">
            <li>
              <span>Domain durumu</span>
              <strong>
                {pilot.mailDomain?.verificationStatus ?? "kayıt yok"}
              </strong>
            </li>
            <li>
              <span>DNS SPF</span>
              <strong>{pilot.dnsCheck.spf.ok ? "ok" : "eksik"}</strong>
            </li>
            <li>
              <span>DNS DKIM</span>
              <strong>{pilot.dnsCheck.dkim.ok ? "ok" : "eksik"}</strong>
            </li>
          </ul>
        ) : null}
        {pilot ? (
          <div className="pa-panel" style={{ marginTop: "0.75rem" }}>
            <p className="module-hint">
              isimtescil TXT: SPF → <code>{pilot.dnsInstructions.spfHost}</code>
              , DKIM → <code>{pilot.dnsInstructions.dkimHost}</code>
            </p>
          </div>
        ) : null}
        <div className="pa-toolbar" style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            className="pa-btn pa-btn--secondary"
            onClick={() => void verifyTenantDns()}
          >
            kullanici.lerta.tr DNS doğrula
          </button>
        </div>
      </section>

      <section className="pa-panel">
        <h2 className="pa-panel-title">Pilot organizasyon gönderen</h2>
        <div className="pa-toolbar">
          <select
            className="pa-input"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          >
            <option value="">Organizasyon seçin</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.legalName} ({c.id.slice(0, 8)}…)
              </option>
            ))}
          </select>
          <input
            className="pa-input"
            placeholder="slug (ör. acme-lojistik)"
            value={localPart}
            onChange={(e) => setLocalPart(e.target.value)}
          />
          <input
            className="pa-input"
            placeholder="Görünen ad (isteğe bağlı)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <button
            type="button"
            className="pa-btn pa-btn--primary"
            onClick={() => void provisionPilot()}
          >
            Provision → {localPart || "slug"}@{tenantDomain}
          </button>
        </div>
        {pilot && pilot.senders.length > 0 ? (
          <div className="admin-data-table-wrap" style={{ marginTop: "1rem" }}>
            <table className="pa-outbox-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>Org</th>
                </tr>
              </thead>
              <tbody>
                {pilot.senders.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <code>
                        {s.localPart}@{tenantDomain}
                      </code>
                    </td>
                    <td style={{ fontSize: "0.72rem" }}>{s.organizationId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="pa-panel">
        <h2 className="pa-panel-title">Özel domain (B5 — musteri.com)</h2>
        <p className="pa-panel-lead">
          Organizasyon sahibi <strong>Hesap → E-posta kimliği</strong> üzerinden
          de kayıt açabilir. Admin buradan da ekleyebilir; DKIM anahtarı otomatik
          üretilir. DNS doğrulama → OpenDKIM (<code>MAIL_SYNC_OPENDKIM=true</code>{" "}
          veya <code>scripts/register-opendkim-custom-domain.sh</code>).
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
                  <td style={{ fontSize: "0.72rem" }}>
                    {row.organizationId ?? "—"}
                  </td>
                  <td>{row.verificationStatus}</td>
                  <td>
                    <button
                      type="button"
                      className="pa-btn pa-btn--ghost"
                      style={{ fontSize: "0.75rem" }}
                      onClick={() => {
                        setSelectedDomainId(row.id);
                        void verifyDomain(row);
                      }}
                    >
                      {row.domainType === "custom" ? "DNS doğrula" : "Manuel doğrula"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pa-panel">
        <h2 className="pa-panel-title">Seçili domaine gönderen (manuel)</h2>
        <div className="pa-toolbar">
          <button
            type="button"
            className="pa-btn pa-btn--secondary"
            onClick={() => void addSender()}
          >
            Kimlik ekle
          </button>
        </div>
        <p className="module-hint">Seçili domain id: {selectedDomainId || "—"}</p>
      </section>
    </div>
  );
}
