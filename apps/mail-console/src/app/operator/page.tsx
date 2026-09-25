"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  fetchMailPlatformBillingHealth,
  type MailBillingA1ChecklistItem,
  fetchMailPlatformMonitoring,
  fetchMailPlatformKpi,
  type MailPlatformKpi,
  fetchOperatorDomains,
  fetchOperatorTenants,
  isPlatformOperator,
  operatorSuspendTenant,
  operatorUnsuspendTenant,
  operatorVerifyDomainDns,
  type MailOperatorTenantRow,
  type MailPlatformMonitoring,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

type DomainRow = {
  id: string;
  domain: string;
  domainType: string;
  verificationStatus: string;
  organizationId: string | null;
};

export default function OperatorPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [denied, setDenied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState("");
  const [billingStatus, setBillingStatus] = useState<
    Awaited<ReturnType<typeof fetchMailPlatformBillingHealth>>["status"] | null
  >(null);
  const [billingA1, setBillingA1] = useState<{
    ready: boolean;
    checklist: MailBillingA1ChecklistItem[];
  } | null>(null);
  const [tenants, setTenants] = useState<MailOperatorTenantRow[]>([]);
  const [tenantBusyId, setTenantBusyId] = useState<string | null>(null);
  const [monitoring, setMonitoring] = useState<MailPlatformMonitoring | null>(
    null,
  );
  const [kpi, setKpi] = useState<MailPlatformKpi | null>(null);

  async function reload() {
    if (!accessToken) {
      return;
    }
    const data = await fetchOperatorDomains(accessToken);
    setDomains(data.domains as DomainRow[]);
  }

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      const ok = await isPlatformOperator(accessToken);
      if (!ok) {
        setDenied(true);
        return;
      }
      await reload();
      try {
        const tenantData = await fetchOperatorTenants(accessToken);
        setTenants(tenantData.tenants);
      } catch {
        setTenants([]);
      }
      try {
        const billing = await fetchMailPlatformBillingHealth(accessToken);
        setBillingStatus(billing.status);
        setBillingA1(billing.a1);
      } catch {
        setBillingStatus(null);
        setBillingA1(null);
      }
      try {
        const mon = await fetchMailPlatformMonitoring(accessToken);
        setMonitoring(mon.monitoring);
      } catch {
        setMonitoring(null);
      }
      try {
        const kpiData = await fetchMailPlatformKpi(accessToken);
        setKpi(kpiData.kpi);
      } catch {
        setKpi(null);
      }
    })();
  }, [accessToken, router]);

  async function verifyRow(domainId: string) {
    if (!accessToken) {
      return;
    }
    setBusyId(domainId);
    setFlash("");
    try {
      const result = await operatorVerifyDomainDns(accessToken, domainId);
      const check = result.dnsCheck;
      setFlash(
        check?.ok
          ? "DNS doğrulandı."
          : `DNS eksik — MX:${check?.mx?.ok ? "✓" : "✗"} SPF:${check?.spf.ok ? "✓" : "✗"} DKIM:${check?.dkim.ok ? "✓" : "✗"}`,
      );
      await reload();
    } catch {
      setFlash("Doğrulama başarısız.");
    } finally {
      setBusyId(null);
    }
  }

  if (!accessToken) {
    return null;
  }

  if (denied) {
    return (
      <ConsoleShell operator={false}>
        <p>Bu sayfa yalnızca platform operatörleri için.</p>
      </ConsoleShell>
    );
  }

  return (
    <ConsoleShell operator={true}>
      <h1 style={{ marginTop: 0 }}>Operatör — mail domainleri</h1>
      {kpi ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Ürün KPI (özet)</h2>
          <p style={{ margin: "0 0 12px", fontSize: "0.95rem" }}>{kpi.summaryTr}</p>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: "0.9rem" }}>
            <li>
              Tenant: {kpi.tenants.total} (askıda {kpi.tenants.suspended}) · ödeme
              planı {kpi.tenants.onPaidMailPlan}
            </li>
            <li>
              Doğrulanmış özel domain: {kpi.tenants.withVerifiedCustomDomain} ·
              platform oranı {kpi.domains.verificationRatePercent}%
            </li>
            <li>
              7 gün outbound aktif tenant: {kpi.tenants.activeOutboundLast7Days}
            </li>
            <li>
              Outbox: bekleyen {kpi.outbox.pending}, başarısız {kpi.outbox.failed},
              24s gönderim {kpi.outbox.sentLast24h}
            </li>
            <li>
              Faturalama: aktif {kpi.billing.active}, grace {kpi.billing.grace},
              gecikmiş {kpi.billing.pastDue}
            </li>
            <li>
              Bounce suppression: {kpi.suppressions.bounceTotal} (7g +{" "}
              {kpi.suppressions.addedLast7Days})
            </li>
          </ul>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
            API: <code>GET platform-admin/mail/kpi</code>
          </p>
        </div>
      ) : null}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>SPF / DKIM rotasyon (E6)</h2>
        <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: "0.9rem" }}>
          Anahtar veya gönderim IP değişiminde dual-selector DKIM yayınla, SPF ve
          PTR güncelle, DMARC fail spike izle. Tam adımlar: repo{" "}
          <code>docs/MAIL_SPF_DKIM_ROTATION_RUNBOOK.md</code>
        </p>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: "0.9rem" }}>
          <li>DMARC konsol + <code>verify-mail-dns-lerta.sh</code></li>
          <li>Yeni DKIM selector DNS + OpenDKIM KeyTable</li>
          <li>
            <code>MAIL_SYNC_OPENDKIM=true</code> ve{" "}
            <code>MAIL_PLATFORM_SPF_IPV4</code> senkron
          </li>
          <li>
            Müşteri domain:{" "}
            <code>verify-custom-domain-mail-dns.sh musteri.com</code>
          </li>
          <li>48s sonra eski selector kaldır</li>
        </ol>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Yedekleme / DR (E7)</h2>
        <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: "0.9rem" }}>
          RPO ~24h / RTO ~4h (pilot). Günlük: PostgreSQL dump +{" "}
          <code>backup-mail-vps-snapshot.sh</code>. Detay:{" "}
          <code>docs/MAIL_BACKUP_DISASTER_RECOVERY.md</code>
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: "0.9rem" }}>
          <li>Maildir: <code>MAIL_IMAP_MAILDIR_ROOT</code> (vars. /var/mail/vhosts)</li>
          <li>OpenDKIM: <code>/etc/opendkim</code> tarball</li>
          <li>Restore: <code>restore-maildir-from-archive.sh … --confirm</code></li>
          <li>Aylık restore drill (staging)</li>
        </ul>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Public API (F5)</h2>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
          <code>/api/v1/public/lerta-mail/v1/messages</code> · Bearer{" "}
          <code>lerta_mail_live_…</code> · webhook HMAC. Konsol{" "}
          <code>/integration</code>
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
          <code>docs/MAIL_PUBLIC_API_WEBHOOKS.md</code>
        </p>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>White-label (F4)</h2>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
          Plan <code>lerta_mail_enterprise_tr</code> → tenant{" "}
          <code>GET/PATCH company/mail-identity/branding</code>, konsol{" "}
          <code>/branding</code>. Logo https, From adı, Lerta şablon gizleme.
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
          <code>docs/MAIL_WHITE_LABEL_ENTERPRISE.md</code>
        </p>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Ölçek / worker (F3)</h2>
        <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: "0.9rem" }}>
          <code>LERTA_MAIL_RUNTIME_ROLE</code>: <strong>all</strong> (tek VPS) ·{" "}
          <strong>api</strong> (LB arkası, arka plan kapalı) ·{" "}
          <strong>worker</strong> (outbox + Postfix). En az bir worker veya{" "}
          <code>all</code> düğüm gerekli.
        </p>
        {monitoring?.runtimeRole ? (
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            Bu instance: <strong>{monitoring.runtimeRole.role}</strong>
            {monitoring.runtimeRole.backgroundJobsEnabled
              ? " · arka plan işleri açık"
              : " · arka plan işleri kapalı"}
            <br />
            <span style={{ color: "var(--muted)" }}>
              {monitoring.runtimeRole.detailTr}
            </span>
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
            Rol bilgisi için F1 izleme yanıtına bakın (
            <code>runtimeRole</code>).
          </p>
        )}
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
          <code>docs/MAIL_MULTI_VPS_SCALE.md</code>
        </p>
      </div>
      {monitoring ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>İzleme (F1)</h2>
          <p style={{ margin: "0 0 8px" }}>
            Genel:{" "}
            <strong
              style={{
                color:
                  monitoring.overallStatus === "ok"
                    ? "var(--success)"
                    : monitoring.overallStatus === "critical"
                      ? "#b91c1c"
                      : "#b45309",
              }}
            >
              {monitoring.overallStatus}
            </strong>
            {" · "}
            API uptime {Math.floor(monitoring.api.uptimeSeconds / 60)} dk
          </p>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: "0.9rem" }}>
            <li>Outbox: {monitoring.outbox.detailTr}</li>
            <li>SMTP: {monitoring.smtp.detailTr}</li>
            <li>Postfix: {monitoring.postfixQueue.detailTr}</li>
            <li>Disk: {monitoring.disk.detailTr}</li>
            <li>TLS: {monitoring.tlsCertificates.detailTr}</li>
          </ul>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
            API: <code>GET platform-admin/mail/monitoring</code> ·{" "}
            <code>docs/MAIL_PLATFORM_MONITORING.md</code>
          </p>
        </div>
      ) : null}
      {flash ? (
        <p style={{ color: "var(--success)", fontWeight: 600 }}>{flash}</p>
      ) : null}
      {billingStatus ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Ödeme altyapısı (Faz A1)</h2>
          {billingA1 ? (
            <p
              style={{
                margin: "0 0 12px",
                fontWeight: 600,
                color: billingA1.ready ? "var(--success)" : "#b45309",
              }}
            >
              A1 test checkout: {billingA1.ready ? "HAZIR" : "eksik adımlar var"}
            </p>
          ) : null}
          {billingA1?.checklist.length ? (
            <ul style={{ margin: "0 0 12px", paddingLeft: 20, fontSize: 14 }}>
              {billingA1.checklist.map((item) => (
                <li key={item.key} style={{ color: item.ok ? "var(--muted)" : "#b45309" }}>
                  {item.ok ? "✓" : "○"} {item.label}
                  {item.detail ? ` — ${item.detail}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <p style={{ margin: "0 0 8px" }}>
            Sağlayıcı: <strong>{billingStatus.provider}</strong>
          </p>
          {billingStatus.checkout.blockers.length > 0 ? (
            <ul style={{ margin: "0 0 8px", paddingLeft: 20, color: "#b45309" }}>
              {billingStatus.checkout.blockers.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          <ul style={{ margin: 0, paddingLeft: 20, color: "var(--muted)" }}>
            <li>
              Stripe:{" "}
              {billingStatus.stripe.configured
                ? billingStatus.stripe.testMode
                  ? "test modu"
                  : "canlı anahtar"
                : "yapılandırılmadı"}
              {billingStatus.stripe.configured ? (
                <>
                  {" "}
                  · API{" "}
                  {billingStatus.stripe.apiReachable === true
                    ? "OK"
                    : billingStatus.stripe.apiReachable === false
                      ? `hata (${billingStatus.stripe.apiError ?? "?"})`
                      : "—"}{" "}
                  · webhook{" "}
                  {billingStatus.stripe.webhookConfigured ? "OK" : "eksik"} ·
                  kurumsal price{" "}
                  {billingStatus.stripe.corporatePriceConfigured ? "OK" : "eksik"}
                  · enterprise price{" "}
                  {billingStatus.stripe.enterprisePriceConfigured ? "OK" : "eksik"}
                </>
              ) : null}
            </li>
            <li>
              iyzico API:{" "}
              {billingStatus.iyzico.apiConfigured ? "OK" : "eksik"} · callback{" "}
              <code style={{ fontSize: 12 }}>{billingStatus.iyzico.callbackUrl}</code>
            </li>
          </ul>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Vitrin:{" "}
            <a href="https://kurumsal.lerta.com.tr" target="_blank" rel="noreferrer">
              kurumsal.lerta.com.tr
            </a>
            · API{" "}
            <code>GET platform-admin/mail/billing-health</code> ·{" "}
            <code>docs/MAIL_BILLING_A1_ACCEPTANCE.md</code>
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
            VPS:{" "}
            <code>
              MAIL_BILLING_JWT=&apos;…&apos; ./scripts/run-mail-billing-a1-acceptance.sh
            </code>
          </p>
        </div>
      ) : null}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Mail tenant&apos;ları</h2>
        {tenants.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Henüz kayıtlı tenant yok.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                <th>Firma</th>
                <th>Plan</th>
                <th>Kutular</th>
                <th>Domain</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tenants.map((row) => (
                <tr key={row.organizationId} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 4px" }}>
                    <strong>{row.companyLegalName}</strong>
                    <br />
                    <code style={{ fontSize: 11 }}>{row.organizationId.slice(0, 8)}…</code>
                  </td>
                  <td>
                    {row.planCode ?? "—"}
                    {row.billingStatus ? (
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {row.billingStatus}
                      </div>
                    ) : null}
                  </td>
                  <td>{row.mailboxCount}</td>
                  <td>
                    {row.customDomain ?? "—"}
                    {row.customDomain ? (
                      <span
                        className={`badge ${row.domainVerified ? "ok" : "pending"}`}
                        style={{ marginLeft: 6 }}
                      >
                        {row.domainVerified ? "DNS OK" : "bekliyor"}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {row.suspended ? (
                      <span className="badge pending">askıda</span>
                    ) : row.abuseFlag ? (
                      <span className="badge pending">abuse</span>
                    ) : (
                      <span className="badge ok">aktif</span>
                    )}
                    {row.suspendReason ? (
                      <div style={{ fontSize: 11, color: "#b45309" }}>
                        {row.suspendReason}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {row.suspended ? (
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={tenantBusyId === row.organizationId}
                        onClick={() => {
                          void (async () => {
                            if (!accessToken) {
                              return;
                            }
                            setTenantBusyId(row.organizationId);
                            try {
                              await operatorUnsuspendTenant(
                                accessToken,
                                row.organizationId,
                              );
                              const data = await fetchOperatorTenants(accessToken);
                              setTenants(data.tenants);
                              setFlash("Tenant askıdan çıkarıldı.");
                            } catch {
                              setFlash("Askı kaldırılamadı.");
                            } finally {
                              setTenantBusyId(null);
                            }
                          })();
                        }}
                      >
                        Askıyı kaldır
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={tenantBusyId === row.organizationId}
                        onClick={() => {
                          const reason = window.prompt(
                            "Askıya alma nedeni (spam/abuse):",
                            "Şüpheli gönderim",
                          );
                          if (!reason) {
                            return;
                          }
                          void (async () => {
                            if (!accessToken) {
                              return;
                            }
                            setTenantBusyId(row.organizationId);
                            try {
                              await operatorSuspendTenant(
                                accessToken,
                                row.organizationId,
                                reason,
                              );
                              const data = await fetchOperatorTenants(accessToken);
                              setTenants(data.tenants);
                              setFlash("Tenant askıya alındı.");
                            } catch {
                              setFlash("Askıya alınamadı.");
                            } finally {
                              setTenantBusyId(null);
                            }
                          })();
                        }}
                      >
                        Askıya al
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Domainler</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <th>Domain</th>
              <th>Tip</th>
              <th>Durum</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {domains.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px 0" }}>{row.domain}</td>
                <td>{row.domainType}</td>
                <td>
                  <span
                    className={`badge ${
                      row.verificationStatus === "verified" ? "ok" : "pending"
                    }`}
                  >
                    {row.verificationStatus}
                  </span>
                </td>
                <td>
                  {row.domainType === "custom" ? (
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={busyId === row.id}
                      onClick={() => void verifyRow(row.id)}
                    >
                      DNS doğrula
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ConsoleShell>
  );
}
