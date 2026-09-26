"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import { MAIL_WEB_URL } from "@/lib/apiConfig";
import { MAIL_SAAS_TENANT_DOMAIN } from "@/lib/mailTenantDomain";
import {
  fetchCustomDomainBundle,
  cancelMailSubscription,
  fetchMailBillingLifecycle,
  fetchMailBillingStatus,
  resumeMailSubscription,
  fetchMailIdentity,
  fetchMailSubscription,
  isPlatformOperator,
  provisionTenantMailbox,
  selectMailPlan,
  startCorporateCheckout,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

const CORPORATE_PLAN_CODE = "lerta_mail_corporate_tr";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [fromAddress, setFromAddress] = useState<string | null>(null);
  const [tenantDomain, setTenantDomain] = useState(MAIL_SAAS_TENANT_DOMAIN);
  const [verified, setVerified] = useState(false);
  const [platformDnsReady, setPlatformDnsReady] = useState(false);
  const [pilotLocalPart, setPilotLocalPart] = useState("");
  const [pilotMessage, setPilotMessage] = useState("");
  const [pilotError, setPilotError] = useState("");
  const [pilotLoading, setPilotLoading] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [sendLimit, setSendLimit] = useState<number | null>(null);
  const [sendUsed, setSendUsed] = useState(0);
  const [sendNearLimit, setSendNearLimit] = useState(false);
  const [sendAtLimit, setSendAtLimit] = useState(false);
  const [sendWindowLabel, setSendWindowLabel] = useState("Son 60 dakika");
  const [storageUsedGb, setStorageUsedGb] = useState(0);
  const [storageLimitGb, setStorageLimitGb] = useState(0);
  const [storagePercent, setStoragePercent] = useState(0);
  const [storageNearLimit, setStorageNearLimit] = useState(false);
  const [storageAtLimit, setStorageAtLimit] = useState(false);
  const [planMessage, setPlanMessage] = useState("");
  const [mailboxQuota, setMailboxQuota] = useState<string>("");
  const [mailboxUsed, setMailboxUsed] = useState(0);
  const [mailboxLimit, setMailboxLimit] = useState(1);
  const [checkoutCanStart, setCheckoutCanStart] = useState(true);
  const [checkoutBlockers, setCheckoutBlockers] = useState<string[]>([]);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [customDomainStatus, setCustomDomainStatus] = useState<string | null>(
    null,
  );
  const [billingLifecycle, setBillingLifecycle] = useState<{
    statusLabelTr: string;
    detailTr: string;
    cancelAtPeriodEnd: boolean;
    inGrace: boolean;
    billingProvider: string;
  } | null>(null);

  async function refreshSubscription(token: string): Promise<string | null> {
    try {
      const sub = await fetchMailSubscription(token);
      setPlanName(sub.subscription.plan?.displayName ?? sub.subscription.planCode);
      setPlanCode(sub.subscription.planCode);
      setSendLimit(sub.subscription.sendRate);
      const quota = sub.subscription.sendRateQuota;
      if (quota) {
        setSendUsed(quota.sendsLastHour);
        setSendNearLimit(quota.nearLimit);
        setSendAtLimit(quota.atLimit);
        setSendWindowLabel(quota.windowLabelTr);
      }
      setMailboxUsed(sub.subscription.mailboxQuota.used);
      setMailboxLimit(sub.subscription.mailboxQuota.limit);
      setMailboxQuota(
        `${sub.subscription.mailboxQuota.used}/${sub.subscription.mailboxQuota.limit} kutu`,
      );
      const storage = sub.subscription.storageQuota;
      if (storage) {
        setStorageUsedGb(storage.usedBytes / (1024 ** 3));
        setStorageLimitGb(storage.limitLabelGb);
        setStoragePercent(storage.utilizationPercent);
        setStorageNearLimit(storage.nearLimit);
        setStorageAtLimit(storage.atLimit);
      }
      return sub.subscription.planCode;
    } catch {
      setPlanName(null);
      setPlanCode(null);
      return null;
    }
  }

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const billing = params?.get("billing") ?? null;
      if (billing === "success") {
        setPlanMessage("Ödeme alındı. Kurumsal plan etkinleştiriliyor…");
      } else if (billing === "cancel") {
        const reason = params?.get("reason");
        setPlanMessage(
          reason
            ? `Ödeme tamamlanamadı (${reason}).`
            : "Ödeme iptal edildi veya tamamlanamadı.",
        );
      }

      setOperator(await isPlatformOperator(accessToken));
      try {
        const data = await fetchMailIdentity(accessToken);
        setFromAddress(data.identity.fromAddress);
        setVerified(data.identity.domainVerified);
        setTenantDomain(data.identity.domain);
        setPlatformDnsReady(data.identity.platformDnsReady);
      } catch {
        setFromAddress(null);
      }

      try {
        const bundle = await fetchCustomDomainBundle(accessToken);
        setCustomDomain(bundle.mailDomain?.domain ?? null);
        setCustomDomainStatus(bundle.mailDomain?.verificationStatus ?? null);
      } catch {
        setCustomDomain(null);
        setCustomDomainStatus(null);
      }

      try {
        const life = await fetchMailBillingLifecycle(accessToken);
        setBillingLifecycle(life.lifecycle);
      } catch {
        setBillingLifecycle(null);
      }

      try {
        const billingStatus = await fetchMailBillingStatus(accessToken);
        setCheckoutCanStart(billingStatus.status.checkout.canStartCorporate);
        setCheckoutBlockers(billingStatus.status.checkout.blockers);
      } catch {
        setCheckoutCanStart(false);
        setCheckoutBlockers(["Ödeme durumu alınamadı"]);
      }

      await refreshSubscription(accessToken);

      if (billing === "success") {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await sleep(attempt === 0 ? 1500 : 2500);
          const activePlan = await refreshSubscription(accessToken);
          if (activePlan === CORPORATE_PLAN_CODE) {
            setPlanMessage("Kurumsal plan aktif.");
            break;
          }
        }
      }
    })();
  }, [accessToken, router]);

  async function payCorporateCheckout() {
    if (!accessToken) {
      return;
    }
    setPlanMessage("");
    try {
      const checkout = await startCorporateCheckout(accessToken);
      if (checkout.url) {
        window.location.href = checkout.url;
        return;
      }
      setPlanMessage(
        checkout.message ??
          "Ödeme URL üretilemedi; Stripe/iyzico .env kontrol edin.",
      );
    } catch {
      setPlanMessage("Ödeme başlatılamadı.");
    }
  }

  async function upgradeToCorporateTrial() {
    if (!accessToken) {
      return;
    }
    setPlanMessage("");
    try {
      await selectMailPlan(accessToken, CORPORATE_PLAN_CODE);
      setPlanMessage("Kurumsal plan (deneme) aktif.");
      await refreshSubscription(accessToken);
    } catch {
      setPlanMessage("Plan güncellenemedi.");
    }
  }

  async function onProvisionPilot(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setPilotError("");
    setPilotMessage("");
    setPilotLoading(true);
    try {
      const result = await provisionTenantMailbox(
        accessToken,
        pilotLocalPart.trim().toLowerCase(),
      );
      setFromAddress(result.fromAddress);
      setPilotMessage(`Pilot kutu hazır: ${result.fromAddress}`);
    } catch (error) {
      setPilotError(
        error instanceof Error
          ? error.message
          : "Kutu oluşturulamadı. Firma sahibi hesabı ve platform DNS gerekli.",
      );
    } finally {
      setPilotLoading(false);
    }
  }

  const isCorporate = planCode === CORPORATE_PLAN_CODE;
  const customVerified = customDomainStatus === "verified";
  const onboardingStep = isCorporate
    ? !customDomain
      ? 1
      : !customVerified
        ? 2
        : !fromAddress
          ? 3
          : 4
    : fromAddress
      ? 3
      : customDomain
        ? 2
        : 1;

  if (!accessToken) {
    return null;
  }

  return (
    <ConsoleShell operator={operator}>
      <h1 style={{ marginTop: 0 }}>Özet</h1>

      {isCorporate && !customVerified ? (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <h2 style={{ marginTop: 0 }}>Özel domain gerekli</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Kurumsal pakette gönderen adresiniz kendi alan adınızda olmalı.
            {customDomain
              ? ` (${customDomain} — DNS doğrulaması bekleniyor)`
              : " Henüz domain eklenmedi."}
          </p>
          <Link className="btn" href="/domain" style={{ marginTop: 12, display: "inline-block" }}>
            Domain sihirbazına git
          </Link>
        </div>
      ) : null}

      <div className="card">
        <h2>Kurulum — adım {onboardingStep}/4</h2>
        <ol style={{ margin: 0, paddingLeft: 20, color: "var(--muted)" }}>
          <li style={{ fontWeight: onboardingStep === 1 ? 600 : 400 }}>
            Özel domain ekle (kurumsal) veya pilot kutu
          </li>
          <li style={{ fontWeight: onboardingStep === 2 ? 600 : 400 }}>
            DNS doğrulama
          </li>
          <li style={{ fontWeight: onboardingStep === 3 ? 600 : 400 }}>
            İlk posta adresi ve plan (ödeme / deneme)
          </li>
          <li style={{ fontWeight: onboardingStep === 4 ? 600 : 400 }}>
            Webmail ile ilk gönderim
          </li>
        </ol>
      </div>

      <div className="card">
        <h2>Plan</h2>
        <p>
          Aktif: <strong>{planName ?? "—"}</strong>
          {mailboxQuota ? ` · ${mailboxQuota}` : ""}
        </p>
        {sendLimit && sendLimit > 0 ? (
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 8px", fontSize: 14 }}>
              Gönderim kotası ({sendWindowLabel}):{" "}
              <strong>{sendUsed}</strong> / {sendLimit}
            </p>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: "var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (sendUsed / sendLimit) * 100)}%`,
                  height: "100%",
                  background:
                    sendAtLimit || sendUsed >= sendLimit
                      ? "#dc2626"
                      : sendNearLimit
                        ? "#d97706"
                        : "var(--accent)",
                }}
              />
            </div>
            {sendAtLimit ? (
              <p style={{ color: "#dc2626", marginTop: 8, marginBottom: 0 }}>
                Saatlik limit doldu. Bir süre sonra tekrar deneyin veya planı
                yükseltin.
              </p>
            ) : sendNearLimit ? (
              <p style={{ color: "#b45309", marginTop: 8, marginBottom: 0 }}>
                Kotaya yaklaşıyorsunuz — yoğun gönderim için Kurumsal plana
                geçin.
              </p>
            ) : null}
          </div>
        ) : null}
        {storageLimitGb > 0 ? (
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 8px", fontSize: 14 }}>
              Depolama: <strong>{storageUsedGb.toFixed(1)}</strong> /{" "}
              {storageLimitGb} GB
            </p>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: "var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, storagePercent)}%`,
                  height: "100%",
                  background:
                    storageAtLimit
                      ? "#dc2626"
                      : storageNearLimit
                        ? "#d97706"
                        : "var(--accent)",
                }}
              />
            </div>
            {storageAtLimit ? (
              <p style={{ color: "#dc2626", marginTop: 8, marginBottom: 0 }}>
                Depolama kotası doldu. Çöp kutusunu temizleyin veya Kurumsal
                plana geçin.
              </p>
            ) : storageNearLimit ? (
              <p style={{ color: "#b45309", marginTop: 8, marginBottom: 0 }}>
                Depolama kotasına yaklaşıyorsunuz.
              </p>
            ) : null}
          </div>
        ) : null}
        {mailboxLimit > 0 ? (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: "var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (mailboxUsed / mailboxLimit) * 100)}%`,
                  height: "100%",
                  background:
                    mailboxUsed >= mailboxLimit ? "#dc2626" : "var(--accent)",
                }}
              />
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>
              <Link href="/mailboxes">Posta kutularını yönet</Link>
            </p>
          </div>
        ) : null}
        {checkoutBlockers.length > 0 && !checkoutCanStart ? (
          <ul style={{ color: "var(--muted)", fontSize: 14, marginTop: 0 }}>
            {checkoutBlockers.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {billingLifecycle ? (
          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 8,
              background: billingLifecycle.inGrace
                ? "#fff7ed"
                : billingLifecycle.cancelAtPeriodEnd
                  ? "#f8fafc"
                  : "transparent",
              border: billingLifecycle.inGrace
                ? "1px solid #fdba74"
                : "1px solid var(--border)",
            }}
          >
            <strong>{billingLifecycle.statusLabelTr}</strong>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--muted)" }}>
              {billingLifecycle.detailTr}
            </p>
            {billingLifecycle.billingProvider === "stripe" ? (
              <div style={{ marginTop: 10 }}>
                {billingLifecycle.cancelAtPeriodEnd ? (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      void (async () => {
                        if (!accessToken) {
                          return;
                        }
                        try {
                          const res = await resumeMailSubscription(accessToken);
                          setBillingLifecycle(res.lifecycle);
                          setPlanMessage("Abonelik yenileme tekrar açıldı.");
                        } catch {
                          setPlanMessage("Yenileme açılamadı.");
                        }
                      })();
                    }}
                  >
                    İptali geri al
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Abonelik dönem sonunda iptal edilecek. Emin misiniz?",
                        )
                      ) {
                        return;
                      }
                      void (async () => {
                        if (!accessToken) {
                          return;
                        }
                        try {
                          const res = await cancelMailSubscription(accessToken);
                          setBillingLifecycle(res.lifecycle);
                          setPlanMessage("Dönem sonunda iptal planlandı.");
                        } catch {
                          setPlanMessage("İptal isteği gönderilemedi.");
                        }
                      })();
                    }}
                  >
                    Dönem sonunda iptal
                  </button>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
        {planMessage ? (
          <p style={{ color: "var(--success)", fontWeight: 600 }}>{planMessage}</p>
        ) : null}
        <button
          type="button"
          className="btn"
          disabled={!checkoutCanStart}
          onClick={() => void payCorporateCheckout()}
        >
          Öde ve Kurumsal’a geç
        </button>
        <button
          type="button"
          className="btn secondary"
          style={{ marginLeft: 8 }}
          onClick={() => void upgradeToCorporateTrial()}
        >
          Deneme (ödeme yok)
        </button>
      </div>

      <div className="card">
        <h2>Kurumsal posta kutusu</h2>
        <p>
          Adres: <strong>{fromAddress ?? "Henüz tanımlı değil"}</strong>
        </p>
        <p>
          Domain durumu:{" "}
          <span className={`badge ${verified ? "ok" : "pending"}`}>
            {verified ? "Doğrulandı" : "Kurulum gerekli"}
          </span>
          {platformDnsReady ? (
            <span className="badge ok" style={{ marginLeft: 8 }}>
              Platform DNS OK
            </span>
          ) : (
            <span className="badge pending" style={{ marginLeft: 8 }}>
              Platform DNS bekliyor
            </span>
          )}
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="btn secondary" href="/domain">
            Özel domain
          </Link>
          <a
            className="btn"
            href={MAIL_WEB_URL}
            style={{ marginLeft: 8 }}
            target="_blank"
            rel="noreferrer"
          >
            Webmail aç
          </a>
        </p>
      </div>

      {!fromAddress && !isCorporate ? (
        <div className="card">
          <h2>Pilot kutu ({tenantDomain})</h2>
          <p style={{ color: "var(--muted)" }}>
            Hemen denemek için paylaşımlı tenant alt alanında adres açın (ör.
            sirketiniz@{tenantDomain}). Özel domain için{" "}
            <Link href="/domain">domain sihirbazı</Link>.
          </p>
          <form onSubmit={onProvisionPilot}>
            <input
              className="input"
              placeholder="sirket-adiniz"
              value={pilotLocalPart}
              onChange={(e) => setPilotLocalPart(e.target.value)}
              required
              minLength={3}
            />
            <button className="btn" type="submit" disabled={pilotLoading}>
              @{tenantDomain} oluştur
            </button>
          </form>
          {pilotMessage ? (
            <p style={{ color: "var(--success)", fontWeight: 600 }}>
              {pilotMessage}
            </p>
          ) : null}
          {pilotError ? <p className="auth-error">{pilotError}</p> : null}
        </div>
      ) : null}
    </ConsoleShell>
  );
}
