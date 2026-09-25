"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  addMailSuppression,
  fetchAuthSession,
  fetchMailDeliveryPanel,
  isPlatformOperator,
  removeMailSuppression,
  type MailDeliveryPanel,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

export default function DeliveryPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [panel, setPanel] = useState<MailDeliveryPanel | null>(null);
  const [error, setError] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [blockEmail, setBlockEmail] = useState("");
  const [message, setMessage] = useState("");

  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const data = await fetchMailDeliveryPanel(accessToken, 7);
    setPanel(data.panel);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      try {
        setOperator(await isPlatformOperator(accessToken));
        const session = await fetchAuthSession(accessToken);
        const roles = session.session.roleCodes;
        setCanManage(
          roles.includes("COMPANY_OWNER") || roles.includes("MAIL_ADMIN"),
        );
        await reload();
      } catch {
        setError("Teslimat verisi yüklenemedi.");
      }
    })();
  }, [accessToken, reload, router]);

  async function onAddSuppression(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !blockEmail.trim()) {
      return;
    }
    setError("");
    setMessage("");
    try {
      await addMailSuppression(accessToken, blockEmail.trim());
      setBlockEmail("");
      setMessage("Adres engellendi.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eklenemedi.");
    }
  }

  async function onRemove(email: string) {
    if (!accessToken) {
      return;
    }
    setError("");
    try {
      await removeMailSuppression(accessToken, email);
      setMessage(`${email} listeden çıkarıldı.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  return (
    <ConsoleShell operator={operator}>
      <h1>Teslimat</h1>
      <p style={{ color: "var(--muted)", maxWidth: 640 }}>
        Son 7 gün kurumsal webmail gönderimleri, bounce kaynaklı engeller ve
        manuel suppression listesi.
      </p>
      {error ? <p className="login-error">{error}</p> : null}
      {message ? (
        <p style={{ color: "#15803d", marginTop: 8 }}>{message}</p>
      ) : null}
      {panel ? (
        <>
          <div className="stat-row">
            <div className="stat-card">
              <strong>{panel.sent.total}</strong>
              <span>Gönderim (7 gün)</span>
            </div>
            <div className="stat-card">
              <strong>{panel.suppressions.total}</strong>
              <span>Engelli adres</span>
            </div>
            <div className="stat-card">
              <strong>{panel.suppressions.bounceRelated}</strong>
              <span>Bounce (otomatik)</span>
            </div>
          </div>
          <h2>Günlük gönderim</h2>
          {panel.sent.daily.length === 0 ? (
            <p>Bu dönemde gönderim yok.</p>
          ) : (
            <table className="console-table">
              <thead>
                <tr>
                  <th>Gün (UTC)</th>
                  <th>Adet</th>
                </tr>
              </thead>
              <tbody>
                {panel.sent.daily.map((row) => (
                  <tr key={row.day}>
                    <td>{row.day}</td>
                    <td>{row.sentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h2>Son gönderimler</h2>
          {panel.sent.recent.length === 0 ? (
            <p>Kayıt yok.</p>
          ) : (
            <table className="console-table">
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Kime</th>
                  <th>Konu</th>
                </tr>
              </thead>
              <tbody>
                {panel.sent.recent.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {new Date(row.sentAt).toLocaleString("tr-TR")}
                    </td>
                    <td>{row.toAddress}</td>
                    <td>{row.subject}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h2>Suppression listesi</h2>
          {canManage ? (
            <form onSubmit={(e) => void onAddSuppression(e)} className="inline-form">
              <input
                type="email"
                placeholder="engelle@ornek.com"
                value={blockEmail}
                onChange={(e) => setBlockEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn secondary">
                Engelle
              </button>
            </form>
          ) : null}
          {panel.suppressions.items.length === 0 ? (
            <p>Liste boş.</p>
          ) : (
            <table className="console-table">
              <thead>
                <tr>
                  <th>E-posta</th>
                  <th>Neden</th>
                  <th>Kaynak</th>
                  {canManage ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {panel.suppressions.items.map((row) => (
                  <tr key={row.emailAddress}>
                    <td>{row.emailAddress}</td>
                    <td>{row.reason}</td>
                    <td>{row.source}</td>
                    {canManage ? (
                      <td>
                        <button
                          type="button"
                          className="btn link"
                          onClick={() => void onRemove(row.emailAddress)}
                        >
                          Kaldır
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <p>Yükleniyor…</p>
      )}
    </ConsoleShell>
  );
}
