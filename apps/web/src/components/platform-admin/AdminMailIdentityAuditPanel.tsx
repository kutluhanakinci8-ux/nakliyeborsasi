"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PlatformAdminApiClient,
  type MailIdentityAuditLogRow,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

const ACTION_LABELS: Record<string, string> = {
  MAIL_IDENTITY_CUSTOM_DOMAIN_REGISTERED: "Özel domain kaydı",
  MAIL_IDENTITY_CUSTOM_DOMAIN_DNS_VERIFIED: "Özel domain DNS doğrulandı",
  MAIL_IDENTITY_CUSTOM_DOMAIN_DNS_FAILED: "DNS doğrulama başarısız",
  MAIL_IDENTITY_SENDER_PROVISIONED: "Gönderen oluşturuldu",
  MAIL_IDENTITY_DISPLAY_NAME_UPDATED: "Görünen ad güncellendi",
  MAIL_IDENTITY_SUPPRESSION_ADDED: "Org suppression eklendi",
  MAIL_IDENTITY_SUPPRESSION_REMOVED: "Org suppression kaldırıldı",
  MAIL_IDENTITY_TENANT_SUBDOMAIN_PROVISIONED: "Pilot @kullanici.lerta.tr gönderen",
  MAIL_IDENTITY_TENANT_SUBDOMAIN_DNS_VERIFIED: "kullanici.lerta.tr DNS doğrulandı",
  MAIL_IDENTITY_ADMIN_DOMAIN_CREATED: "Admin domain eklendi",
  MAIL_IDENTITY_ADMIN_DOMAIN_DNS_VERIFIED: "Admin DNS doğrulama (custom)",
  MAIL_IDENTITY_ADMIN_DOMAIN_MANUAL_VERIFIED: "Admin manuel verified",
};

function formatMeta(meta: Record<string, unknown> | null): string {
  if (!meta) {
    return "—";
  }
  const parts: string[] = [];
  if (meta.domain) {
    parts.push(String(meta.domain));
  }
  if (meta.fromAddress) {
    parts.push(String(meta.fromAddress));
  }
  if (meta.email) {
    parts.push(String(meta.email));
  }
  if (meta.organizationId) {
    parts.push(`org ${String(meta.organizationId).slice(0, 8)}…`);
  }
  if (meta.channel) {
    parts.push(String(meta.channel));
  }
  return parts.length > 0 ? parts.join(" · ") : JSON.stringify(meta);
}

export function AdminMailIdentityAuditPanel() {
  const { accessToken } = useWebSession();
  const [logs, setLogs] = useState<MailIdentityAuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      setLogs(await PlatformAdminApiClient.fetchMailIdentityAudit(accessToken));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="pa-mail-audit">
      <section className="pa-panel">
        <h2 className="pa-panel-title">Faz B6 — Gönderen kimliği denetimi</h2>
        <p className="pa-panel-lead">
          Domain ekleme, DNS doğrulama, gönderen provision ve org suppression
          işlemleri KVKK amaçlı <code>audit_logs</code> tablosuna yazılır (kim,
          hangi org, ne zaman).
        </p>
        <div className="pa-toolbar">
          <button
            type="button"
            className="pa-btn pa-btn--secondary"
            onClick={() => void refresh()}
          >
            Yenile
          </button>
        </div>
        {loading ? <p className="module-hint">Yükleniyor…</p> : null}
        <div className="admin-data-table-wrap" style={{ marginTop: "1rem" }}>
          <table className="pa-outbox-table">
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Olay</th>
                <th>Org / kullanıcı</th>
                <th>Detay</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                    {new Date(row.createdAt).toLocaleString("tr-TR")}
                  </td>
                  <td>
                    {ACTION_LABELS[row.actionCode] ?? row.actionCode}
                  </td>
                  <td style={{ fontSize: "0.72rem" }}>
                    {row.actorCompanyId
                      ? row.actorCompanyId.slice(0, 8) + "…"
                      : "—"}
                    <br />
                    {row.actorUserId ? row.actorUserId.slice(0, 8) + "…" : "—"}
                  </td>
                  <td style={{ fontSize: "0.75rem" }}>
                    {formatMeta(row.metadata)}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="module-hint">
                    Henüz mail kimliği denetim kaydı yok.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
