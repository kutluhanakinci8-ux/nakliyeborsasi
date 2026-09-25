"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  fetchCustomDomainBundle,
  fetchAuthSession,
  fetchMailSenders,
  isPlatformOperator,
  provisionCustomMailbox,
  provisionTenantMailbox,
  setDefaultMailSender,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

type SenderRow = {
  id: string;
  fromAddress: string;
  displayName: string | null;
  isDefault: boolean;
  domain: string;
};

export default function MailboxesPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [senders, setSenders] = useState<SenderRow[]>([]);
  const [quota, setQuota] = useState({ used: 0, limit: 1 });
  const [customVerified, setCustomVerified] = useState(false);
  const [localPart, setLocalPart] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [channel, setChannel] = useState<"custom" | "tenant">("custom");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [canManage, setCanManage] = useState(true);

  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const data = await fetchMailSenders(accessToken);
    setSenders(data.senders);
    setQuota(data.mailboxQuota);
    try {
      const bundle = await fetchCustomDomainBundle(accessToken);
      const verified =
        bundle.mailDomain?.verificationStatus === "verified";
      setCustomVerified(verified);
      setChannel(verified ? "custom" : "tenant");
    } catch {
      setCustomVerified(false);
      setChannel("tenant");
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      setOperator(await isPlatformOperator(accessToken));
      const session = await fetchAuthSession(accessToken);
      const roles = session.session.roleCodes;
      setCanManage(
        roles.includes("COMPANY_OWNER") || roles.includes("MAIL_ADMIN"),
      );
      await reload();
    })();
  }, [accessToken, reload, router]);

  const atQuota = quota.used >= quota.limit;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || atQuota) {
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const part = localPart.trim().toLowerCase();
      if (channel === "custom") {
        await provisionCustomMailbox(accessToken, part, {
          displayName: displayName.trim() || undefined,
          makeDefault: senders.length === 0,
        });
      } else {
        await provisionTenantMailbox(accessToken, part, {
          displayName: displayName.trim() || undefined,
          makeDefault: senders.length === 0,
        });
      }
      setMessage(`Kutu eklendi: ${part}`);
      setLocalPart("");
      await reload();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Kutu eklenemedi. Kota veya DNS kontrol edin.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function makeDefault(senderId: string) {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      await setDefaultMailSender(accessToken, senderId);
      setMessage("Varsayılan gönderen güncellendi.");
      await reload();
    } catch {
      setError("Varsayılan adres güncellenemedi.");
    } finally {
      setLoading(false);
    }
  }

  if (!accessToken) {
    return null;
  }

  const quotaPercent =
    quota.limit > 0 ? Math.min(100, (quota.used / quota.limit) * 100) : 0;

  return (
    <ConsoleShell operator={operator}>
      <h1 style={{ marginTop: 0 }}>Posta kutuları</h1>
      <p style={{ color: "var(--muted)" }}>
        Plan kotanız dahilinde birden fazla gönderen adresi tanımlayabilirsiniz.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Kota</h2>
        <p style={{ margin: "0 0 8px" }}>
          <strong>{quota.used}</strong> / {quota.limit} kutu kullanılıyor
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
              width: `${quotaPercent}%`,
              height: "100%",
              background: atQuota ? "#dc2626" : "var(--accent)",
            }}
          />
        </div>
        {atQuota ? (
          <p style={{ color: "#b45309", marginTop: 12, marginBottom: 0 }}>
            Kota doldu. Planı yükseltin veya kullanılmayan adresleri kaldırmak için
            destek ile iletişime geçin.
          </p>
        ) : null}
      </div>

      {message ? (
        <p style={{ color: "var(--success)", fontWeight: 600 }}>{message}</p>
      ) : null}
      {error ? <p className="auth-error">{error}</p> : null}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Adresler</h2>
        {senders.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Henüz kutu yok.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                <th>Adres</th>
                <th>Görünen ad</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {senders.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 0" }}>
                    {row.fromAddress}
                    {row.isDefault ? (
                      <span className="badge ok" style={{ marginLeft: 8 }}>
                        varsayılan
                      </span>
                    ) : null}
                  </td>
                  <td>{row.displayName ?? "—"}</td>
                  <td>
                    {canManage && !row.isDefault ? (
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={loading}
                        onClick={() => void makeDefault(row.id)}
                      >
                        Varsayılan yap
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canManage ? (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Yeni kutu</h2>
        {customVerified ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            Özel domain doğrulandı — yeni adresler domaininiz altında açılır.
          </p>
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            Özel domain henüz doğrulanmadı; pilot alt alanı (
            kullanici.lerta.com.tr) kullanılır.
          </p>
        )}
        <form onSubmit={onSubmit}>
          <input
            className="input"
            placeholder="info, satis, destek…"
            value={localPart}
            onChange={(e) => setLocalPart(e.target.value)}
            required
            minLength={2}
            disabled={atQuota || loading}
          />
          <input
            className="input"
            placeholder="Görünen ad (isteğe bağlı)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={atQuota || loading}
          />
          <button className="btn" type="submit" disabled={atQuota || loading}>
            Kutu ekle
          </button>
        </form>
      </div>
      ) : (
        <p style={{ color: "var(--muted)" }}>
          Salt okunur rol — kutu ekleyemez veya varsayılanı değiştiremezsiniz.
        </p>
      )}
    </ConsoleShell>
  );
}
