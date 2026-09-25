"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  fetchMailBillingStatus,
  fetchOperatorDomains,
  fetchOperatorTenants,
  isPlatformOperator,
  operatorSuspendTenant,
  operatorUnsuspendTenant,
  operatorVerifyDomainDns,
  type MailOperatorTenantRow,
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
    Awaited<ReturnType<typeof fetchMailBillingStatus>>["status"] | null
  >(null);
  const [tenants, setTenants] = useState<MailOperatorTenantRow[]>([]);
  const [tenantBusyId, setTenantBusyId] = useState<string | null>(null);

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
        const billing = await fetchMailBillingStatus(accessToken);
        setBillingStatus(billing.status);
      } catch {
        setBillingStatus(null);
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
      {flash ? (
        <p style={{ color: "var(--success)", fontWeight: 600 }}>{flash}</p>
      ) : null}
      {billingStatus ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Ödeme altyapısı</h2>
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
                  price id{" "}
                  {billingStatus.stripe.corporatePriceConfigured ? "OK" : "eksik"}
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
