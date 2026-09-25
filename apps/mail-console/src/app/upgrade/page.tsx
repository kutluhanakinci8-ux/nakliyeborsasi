"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  fetchMailSubscription,
  isPlatformOperator,
  startCorporateCheckout,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

const CORPORATE = "lerta_mail_corporate_tr";
const PILOT = "lerta_mail_pilot_tr";

export default function UpgradePage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      setOperator(await isPlatformOperator(accessToken));
      const sub = await fetchMailSubscription(accessToken);
      setPlanCode(sub.subscription.planCode);
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
      <p style={{ marginTop: 24 }}>
        <Link href="/dashboard">← Özet</Link>
      </p>
    </ConsoleShell>
  );
}
