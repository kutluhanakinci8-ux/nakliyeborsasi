"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import { MAIL_WEB_URL } from "@/lib/apiConfig";
import {
  fetchMailIdentity,
  fetchMailSubscription,
  isPlatformOperator,
  provisionTenantMailbox,
  selectMailPlan,
  startCorporateCheckout,
} from "@/lib/consoleApi";

const CORPORATE_PLAN_CODE = "lerta_mail_corporate_tr";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
import { useConsoleSession } from "@/lib/session";

export default function DashboardPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [fromAddress, setFromAddress] = useState<string | null>(null);
  const [tenantDomain, setTenantDomain] = useState("kullanici.lerta.com.tr");
  const [verified, setVerified] = useState(false);
  const [platformDnsReady, setPlatformDnsReady] = useState(false);
  const [pilotLocalPart, setPilotLocalPart] = useState("");
  const [pilotMessage, setPilotMessage] = useState("");
  const [pilotError, setPilotError] = useState("");
  const [pilotLoading, setPilotLoading] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);
  const [sendLimit, setSendLimit] = useState<number | null>(null);
  const [planMessage, setPlanMessage] = useState("");
  const [mailboxQuota, setMailboxQuota] = useState<string>("");

  async function refreshSubscription(token: string): Promise<string | null> {
    try {
      const sub = await fetchMailSubscription(token);
      setPlanName(sub.subscription.plan?.displayName ?? sub.subscription.planCode);
      setSendLimit(sub.subscription.sendRate);
      setMailboxQuota(
        `${sub.subscription.mailboxQuota.used}/${sub.subscription.mailboxQuota.limit} kutu`,
      );
      return sub.subscription.planCode;
    } catch {
      setPlanName(null);
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
        setPlanMessage(
          "Ödeme alındı. Kurumsal plan etkinleştiriliyor…",
        );
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

      await refreshSubscription(accessToken);

      if (billing === "success") {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await sleep(attempt === 0 ? 1500 : 2500);
          const planCode = await refreshSubscription(accessToken);
          if (planCode === CORPORATE_PLAN_CODE) {
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

  if (!accessToken) {
    return null;
  }

  return (
    <ConsoleShell operator={operator}>
      <h1 style={{ marginTop: 0 }}>Özet</h1>
      <div className="card">
        <h2>Plan</h2>
        <p>
          Aktif: <strong>{planName ?? "—"}</strong>
          {sendLimit ? ` · Gönderim: ${sendLimit}/saat` : ""}
          {mailboxQuota ? ` · ${mailboxQuota}` : ""}
        </p>
        {planMessage ? (
          <p style={{ color: "var(--success)", fontWeight: 600 }}>{planMessage}</p>
        ) : null}
        <button type="button" className="btn" onClick={() => void payCorporateCheckout()}>
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

      {!fromAddress ? (
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

      <div className="card">
        <h2>Sonraki adımlar</h2>
        <ol>
          <li>Pilot veya özel domain ile gönderen adresi tanımlayın</li>
          <li>DNS kayıtlarını (MX, SPF, DKIM) doğrulayın</li>
          <li>posta.lerta.com.tr üzerinden mail atın</li>
        </ol>
      </div>
    </ConsoleShell>
  );
}
