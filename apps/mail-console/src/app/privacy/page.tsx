"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  cancelMailDeletionRequest,
  confirmMailDeletionRequest,
  createMailDeletionRequest,
  downloadMailPrivacyExport,
  fetchMailDeletionStatus,
  fetchMailTeam,
  isPlatformOperator,
  type MailDeletionStatus,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

const DELETION_PHRASE = "LERTA-MAIL-SIL";

export default function PrivacyPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [status, setStatus] = useState<MailDeletionStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [phraseInput, setPhraseInput] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<{
    requestId: string;
    confirmToken: string;
    executeAfter: string;
  } | null>(null);
  const [confirmTokenInput, setConfirmTokenInput] = useState("");

  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const team = await fetchMailTeam(accessToken);
    setCanManage(team.permissions.canManageRoles);
    setStatus(await fetchMailDeletionStatus(accessToken));
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      try {
        setOperator(await isPlatformOperator(accessToken));
        await reload();
      } catch {
        setError("Gizlilik bilgileri yüklenemedi.");
      }
    })();
  }, [accessToken, reload, router]);

  async function handleExport() {
    if (!accessToken) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { blob, filename } = await downloadMailPrivacyExport(accessToken);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dışa aktarım başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateDeletion() {
    if (!accessToken) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await createMailDeletionRequest(accessToken, {
        confirmPhrase: phraseInput,
        reason: reason.trim() || undefined,
      });
      setPendingConfirm(result);
      setConfirmTokenInput(result.confirmToken);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Talep oluşturulamadı");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDeletion() {
    if (!accessToken || !pendingConfirm) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await confirmMailDeletionRequest(accessToken, {
        requestId: pendingConfirm.requestId,
        confirmToken: confirmTokenInput,
      });
      setPendingConfirm(null);
      setPhraseInput("");
      setReason("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Silme onayı başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelDeletion(requestId: string) {
    if (!accessToken) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await cancelMailDeletionRequest(accessToken, requestId);
      setPendingConfirm(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İptal başarısız");
    } finally {
      setBusy(false);
    }
  }

  const activePending =
    status?.hasRequest && status.request?.status === "pending"
      ? status.request
      : null;

  return (
    <ConsoleShell operator={operator}>
      <h1>Gizlilik / KVKK</h1>
      <p style={{ color: "var(--muted)", maxWidth: 720 }}>
        Kurumsal posta verilerinizi JSON olarak indirebilir veya firma sahibi
        olarak hesap ve posta içeriklerinin silinmesini talep edebilirsiniz.
        Silme işlemi bekleme süresi sonrası onay kodu ile tamamlanır.
      </p>

      {error ? (
        <p className="error-banner" style={{ marginTop: 16 }}>{error}</p>
      ) : null}

      {!canManage ? (
        <p style={{ marginTop: 24, color: "var(--muted)" }}>
          Veri dışa aktarımı ve silme talebi yalnızca firma sahibi rolü ile
          kullanılabilir.
        </p>
      ) : (
        <>
          <section className="card" style={{ marginTop: 24 }}>
            <h2 style={{ marginTop: 0 }}>Veri dışa aktarımı</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
              Abonelik, domain, kutular, gönderim ve gelen mesaj özetleri,
              şablonlar ve denetim kayıtları (son kayıtlar) JSON dosyasında
              sunulur. DKIM özel anahtarları dahil edilmez.
            </p>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => void handleExport()}
            >
              JSON indir
            </button>
          </section>

          <section className="card" style={{ marginTop: 24 }}>
            <h2 style={{ marginTop: 0 }}>Hesap ve posta verisi silme</h2>
            {activePending ? (
              <div>
                <p>
                  Bekleyen talep: <code>{activePending.id.slice(0, 8)}…</code>
                </p>
                <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                  En erken silme:{" "}
                  {new Date(activePending.executeAfter).toLocaleString("tr-TR")}
                </p>
                {pendingConfirm ? (
                  <div style={{ marginTop: 16 }}>
                    <p>
                      Onay kodunuz oluşturuldu. Bekleme süresi dolduktan sonra
                      aşağıdaki kodu kullanarak silmeyi tamamlayın (kodu güvenli
                      bir yerde saklayın).
                    </p>
                    <label style={{ display: "block", marginTop: 12 }}>
                      Onay kodu
                      <input
                        className="input"
                        style={{ width: "100%", maxWidth: 480, marginTop: 6 }}
                        value={confirmTokenInput}
                        onChange={(e) => setConfirmTokenInput(e.target.value)}
                      />
                    </label>
                    <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                      <button
                        type="button"
                        className="btn danger"
                        disabled={busy}
                        onClick={() => void handleConfirmDeletion()}
                      >
                        Silmeyi tamamla
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={busy}
                        onClick={() =>
                          void handleCancelDeletion(activePending.id)
                        }
                      >
                        Talebi iptal et
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={busy}
                    onClick={() =>
                      void handleCancelDeletion(activePending.id)
                    }
                  >
                    Bekleyen talebi iptal et
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                  Silme; gelen/giden mesajlar, taslaklar, DMARC özetleri ve
                  benzeri içerikleri kaldırır. Kutular askıya alınır ve gönderim
                  durdurulur. Domain kayıtları DNS özetinden scrub edilir.
                </p>
                <label style={{ display: "block", marginTop: 12 }}>
                  Gerekçe (isteğe bağlı)
                  <textarea
                    className="input"
                    rows={3}
                    style={{ width: "100%", maxWidth: 480, marginTop: 6 }}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <label style={{ display: "block", marginTop: 12 }}>
                  Onay metni — tam olarak{" "}
                  <code>{DELETION_PHRASE}</code> yazın
                  <input
                    className="input"
                    style={{ width: "100%", maxWidth: 320, marginTop: 6 }}
                    value={phraseInput}
                    onChange={(e) => setPhraseInput(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <button
                  type="button"
                  className="btn danger"
                  style={{ marginTop: 16 }}
                  disabled={busy || phraseInput !== DELETION_PHRASE}
                  onClick={() => void handleCreateDeletion()}
                >
                  Silme talebi oluştur
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </ConsoleShell>
  );
}
