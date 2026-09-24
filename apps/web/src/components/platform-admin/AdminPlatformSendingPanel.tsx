"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PlatformAdminApiClient,
  type PlatformSendingSnapshot,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

const ENV_SNIPPET = [
  "MAIL_PLATFORM_DOMAIN=mail.lerta.tr",
  "MAIL_PLATFORM_FROM_EMAIL=notifications@mail.lerta.tr",
  "EMAIL_DELIVERY_PROVIDER=postmark",
  "POSTMARK_SERVER_TOKEN=...",
  "POSTMARK_FROM=Lerta Logistics notifications@mail.lerta.tr",
  "POSTMARK_WEBHOOK_TOKEN=...",
  "POSTMARK_DKIM_HOST=pm._domainkey.mail.lerta.tr",
  "POSTMARK_DKIM_TARGET=(Postmark panelinden)",
  "SMTP_PROFILE=custom",
].join("\n");

function statusLabel(status: string): string {
  if (status === "ok") {
    return "Tamam";
  }
  if (status === "warning") {
    return "Uyarı";
  }
  if (status === "error") {
    return "Hata";
  }
  return "Bekliyor";
}

function statusClass(status: string): string {
  if (status === "ok") {
    return "pa-badge pa-badge--sent";
  }
  if (status === "error") {
    return "pa-badge pa-badge--failed";
  }
  if (status === "warning") {
    return "pa-badge pa-badge--pending";
  }
  return "pa-badge";
}

export function AdminPlatformSendingPanel() {
  const { accessToken } = useWebSession();
  const [snapshot, setSnapshot] = useState<PlatformSendingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const next = await PlatformAdminApiClient.fetchPlatformSendingSnapshot(
        accessToken,
      );
      setSnapshot(next);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const doneCount = snapshot
    ? snapshot.checklist.filter((item) => item.status === "ok").length
    : 0;
  const totalCount = snapshot ? snapshot.checklist.length : 0;

  return (
    <div className="pa-platform-sending">
      {loading && !snapshot ? (
        <p className="module-hint">Platform gönderim kontrol listesi yükleniyor…</p>
      ) : null}

      {snapshot ? (
        <>
          <section className="pa-panel">
            <h2 className="pa-panel-title">Faz A — Platform gönderim (Hedef A)</h2>
            <p className="pa-panel-lead">
              Gönderim alanı: <strong>{snapshot.domain}</strong> · Önerilen From:{" "}
              <code>{snapshot.fromEmail}</code> · {snapshot.registrarHint}
            </p>
            <p className="module-hint">
              Checklist: {doneCount}/{totalCount} tamam · Son kontrol:{" "}
              {new Date(snapshot.checkedAt).toLocaleString("tr-TR")}
            </p>
            <button
              type="button"
              className="pa-btn pa-btn--secondary"
              onClick={() => void refresh()}
            >
              DNS ve yapılandırmayı yeniden kontrol et
            </button>
          </section>

          <section className="pa-panel">
            <h2 className="pa-panel-title">A1-A3 kontrol listesi</h2>
            <ul className="pa-checklist">
              {snapshot.checklist.map((item) => (
                <li key={item.id} className="pa-checklist-item">
                  <div className="pa-checklist-head">
                    <span className={statusClass(item.status)}>
                      {statusLabel(item.status)}
                    </span>
                    <strong>{item.titleTr}</strong>
                  </div>
                  <p className="pa-panel-lead">{item.descriptionTr}</p>
                  {item.detail ? (
                    <p className="module-hint" style={{ marginTop: "0.5rem" }}>
                      {item.detail}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="pa-panel">
            <h2 className="pa-panel-title">DNS kayıtları (isimtescil)</h2>
            <p className="pa-panel-lead">
              Postmark domain doğrulamasından sonra DKIM/CNAME değerlerini VPS env ile
              eşleştirin. Varsayılan alan: <code>mail.lerta.tr</code>
            </p>
            <div className="pa-table-wrap">
              <table className="pa-table">
                <thead>
                  <tr>
                    <th>Tür</th>
                    <th>Host</th>
                    <th>Değer</th>
                    <th>Not</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.dnsRecords.map((row) => (
                    <tr key={`${row.type}-${row.host}-${row.purpose}`}>
                      <td>{row.type}</td>
                      <td>
                        <code>{row.host}</code>
                      </td>
                      <td>
                        <code style={{ wordBreak: "break-all" }}>{row.value}</code>
                      </td>
                      <td>{row.notes ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pa-panel">
            <h2 className="pa-panel-title">VPS ortam değişkenleri (özet)</h2>
            <pre className="pa-code-block">{ENV_SNIPPET}</pre>
            <p className="module-hint">
              Yapılandırılmış From: {snapshot.configuredFrom} · Provider:{" "}
              {snapshot.deliveryProvider}
              {snapshot.postmarkConfigured ? " (token var)" : " (token yok)"}
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
