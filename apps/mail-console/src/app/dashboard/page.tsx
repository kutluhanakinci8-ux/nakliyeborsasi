"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import { MAIL_WEB_URL } from "@/lib/apiConfig";
import {
  fetchMailIdentity,
  isPlatformOperator,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

export default function DashboardPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [fromAddress, setFromAddress] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      setOperator(await isPlatformOperator(accessToken));
      try {
        const data = await fetchMailIdentity(accessToken);
        setFromAddress(data.identity.fromAddress);
        setVerified(data.identity.domainVerified);
      } catch {
        setFromAddress(null);
      }
    })();
  }, [accessToken, router]);

  if (!accessToken) {
    return null;
  }

  return (
    <ConsoleShell operator={operator}>
      <h1 style={{ marginTop: 0 }}>Özet</h1>
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
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="btn secondary" href="/domain">
            Domain kurulumu
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
      <div className="card">
        <h2>Sonraki adımlar</h2>
        <ol>
          <li>Özel domain ekleyin (ör. firma.com.tr)</li>
          <li>DNS kayıtlarını isimtescil paneline girin</li>
          <li>Doğrulama sonrası ilk kutu adresini oluşturun</li>
          <li>posta.lerta.com.tr üzerinden mail atın</li>
        </ol>
      </div>
    </ConsoleShell>
  );
}
