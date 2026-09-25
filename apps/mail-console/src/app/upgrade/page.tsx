"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  fetchMailSubscription,
  isPlatformOperator,
  startCorporateCheckout,
  startEnterpriseCheckout,
  fetchMailBillingStatus,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

const CORPORATE = "lerta_mail_corporate_tr";
const ENTERPRISE = "lerta_mail_enterprise_tr";
const PILOT = "lerta_mail_pilot_tr";

export default function UpgradePage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [enterpriseCheckoutOk, setEnterpriseCheckoutOk] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      setOperator(await isPlatformOperator(accessToken));
      const sub = await fetchMailSubscription(accessToken);
      setPlanCode(sub.subscription.planCode);
      try {
        const billing = await fetchMailBillingStatus(accessToken);
        setEnterpriseCheckoutOk(
          billing.status.checkout.canStartEnterprise,
        );
      } catch {
        setEnterpriseCheckoutOk(false);
      }
    })();
  }, [accessToken, router]);

  async function pay() {
    if (!accessToken) {
      return;
    }
    setMessage("");
    try {
      const checkout = await startCorporateCheckout(accessToken);
      if (checkout.url) {
        window.location.href = checkout.url;
        return;
      }
      setMessage(checkout.message ?? "Ödeme başlatılamadı.");
    } catch {
      setMessage("Ödeme başlatılamadı.");
    }
  }

  async function payEnterprise() {
    if (!accessToken) {
      return;
    }
    setMessage("");
    try {
      const checkout = await startEnterpriseCheckout(accessToken);
      if (checkout.url) {
        window.location.href = checkout.url;
        return;
      }
      setMessage(checkout.message ?? "Enterprise ödeme başlatılamadı.");
    } catch {
      setMessage("Enterprise ödeme başlatılamadı (STRIPE_MAIL_ENTERPRISE_PRICE_ID).");
    }
  }

  if (!accessToken) {
    return null;
  }

  const isPilot = planCode === PILOT || planCode === null;

  return (
    <ConsoleShell operator={operator}>
      <h1 style={{ marginTop: 0 }}>Kurumsal plana geçiş</h1>
      {isPilot ? (
        <p style={{ color: "var(--muted)" }}>
          Pilot paketten Kurumsal&apos;a iki yol: ödeme ile anında yükseltme veya özel
          domain sihirbazı (DNS sonrası kurumsal gönderim).
        </p>
      ) : (
        <p style={{ color: "var(--muted)" }}>
          Aktif plan: <strong>{planCode}</strong>
          {planCode === CORPORATE
            ? " — zaten Kurumsal pakettesiniz."
            : planCode === ENTERPRISE
              ? " — Enterprise aktif (white-label + API)."
              : ""}
        </p>
      )}
      {message ? <p style={{ color: "#b45309" }}>{message}</p> : null}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>1 — Ödeme (Stripe / iyzico)</h2>
        <p style={{ color: "var(--muted)" }}>
          Kurumsal plan, 25 kutu, 500 gönderim/saat, özel domain.
        </p>
        <button type="button" className="btn" onClick={() => void pay()}>
          Öde ve Kurumsal&apos;a geç
        </button>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>2 — Özel domain</h2>
        <p style={{ color: "var(--muted)" }}>
          Alan adınızı ekleyin, DNS doğrulayın, ardından ödeme veya deneme planı ile
          kurumsal gönderen adresi açın.
        </p>
        <Link className="btn secondary" href="/domain?upgrade=1">
          Domain sihirbazı
        </Link>
      </div>
      {planCode !== ENTERPRISE ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>3 — Enterprise</h2>
          <p style={{ color: "var(--muted)" }}>
            White-label, Public API/webhook, yükseltilmiş kota. €149/ay · ₺1490/ay
            (katalog).
          </p>
          <button
            type="button"
            className="btn"
            disabled={!enterpriseCheckoutOk}
            onClick={() => void payEnterprise()}
          >
            Öde ve Enterprise&apos;a geç
          </button>
          {!enterpriseCheckoutOk ? (
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
              Stripe: <code>STRIPE_MAIL_ENTERPRISE_PRICE_ID</code> gerekli.
            </p>
          ) : null}
        </div>
      ) : null}
      <p style={{ marginTop: 24 }}>
        <Link href="/dashboard">← Özet</Link>
      </p>
    </ConsoleShell>
  );
}
