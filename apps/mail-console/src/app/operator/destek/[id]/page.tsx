"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  fetchOperatorSupportTicket,
  isPlatformOperator,
  operatorReplySupportTicket,
  operatorUpdateSupportTicketStatus,
  type MailSupportTicketOperatorDetail,
  type MailSupportTicketStatus,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

const STATUS_LABELS: Record<string, string> = {
  open: "Açık",
  waiting_customer: "Müşteri yanıtı bekleniyor",
  resolved: "Çözüldü",
};

const STATUS_OPTIONS: { value: MailSupportTicketStatus; label: string }[] = [
  { value: "open", label: "Açık" },
  { value: "waiting_customer", label: "Müşteri yanıtı bekleniyor" },
  { value: "resolved", label: "Çözüldü" },
];

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Istanbul",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function OperatorSupportTicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = typeof params.id === "string" ? params.id : "";
  const { accessToken } = useConsoleSession();
  const [denied, setDenied] = useState(false);
  const [ticket, setTicket] = useState<MailSupportTicketOperatorDetail | null>(
    null,
  );
  const [reply, setReply] = useState("");
  const [statusDraft, setStatusDraft] = useState<MailSupportTicketStatus>("open");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!accessToken || !ticketId) {
      return;
    }
    const data = await fetchOperatorSupportTicket(accessToken, ticketId);
    setTicket(data.ticket);
    setStatusDraft(data.ticket.status);
  }, [accessToken, ticketId]);

  useEffect(() => {
    if (!accessToken) {
      router.replace(`/login?next=${encodeURIComponent(`/operator/destek/${ticketId}`)}`);
      return;
    }
    if (!ticketId) {
      router.replace("/operator/destek");
      return;
    }
    void (async () => {
      const ok = await isPlatformOperator(accessToken);
      if (!ok) {
        setDenied(true);
        return;
      }
      setLoading(true);
      try {
        await reload();
        setError("");
      } catch {
        setError("Talep bulunamadı veya yüklenemedi.");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, reload, router, ticketId]);

  async function onReply(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !ticketId) {
      return;
    }
    setError("");
    setFlash("");
    setLoading(true);
    try {
      await operatorReplySupportTicket(accessToken, ticketId, reply.trim());
      setReply("");
      setFlash("Lerta yanıtı gönderildi.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yanıt gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function onStatusSave() {
    if (!accessToken || !ticketId || !ticket) {
      return;
    }
    if (statusDraft === ticket.status) {
      return;
    }
    setError("");
    setFlash("");
    setLoading(true);
    try {
      await operatorUpdateSupportTicketStatus(
        accessToken,
        ticketId,
        statusDraft,
      );
      setFlash("Durum güncellendi.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Durum güncellenemedi.");
    } finally {
      setLoading(false);
    }
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
      <p style={{ marginTop: 0 }}>
        <Link href="/operator/destek">← Tüm talepler</Link>
      </p>

      {loading && !ticket ? (
        <p style={{ color: "var(--muted)" }}>Yükleniyor…</p>
      ) : null}
      {error ? (
        <p className="error-banner" style={{ marginTop: 16 }}>
          {error}
        </p>
      ) : null}
      {flash ? (
        <p style={{ marginTop: 16, color: "var(--muted)" }}>{flash}</p>
      ) : null}

      {ticket ? (
        <>
          <h1>
            #{ticket.publicRef} — {ticket.subject}
          </h1>
          <p style={{ color: "var(--muted)" }}>
            {ticket.companyLegalName}
            {ticket.domainName ? ` · ${ticket.domainName}` : ""}
            {" · "}
            Güncelleme: {formatWhen(ticket.updatedAt)}
          </p>

          <div
            className="card"
            style={{
              marginTop: 16,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "flex-end",
            }}
          >
            <div>
              <label htmlFor="status">Durum</label>
              <select
                id="status"
                className="input"
                value={statusDraft}
                onChange={(e) =>
                  setStatusDraft(e.target.value as MailSupportTicketStatus)
                }
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn secondary"
              disabled={loading || statusDraft === ticket.status}
              onClick={() => void onStatusSave()}
            >
              Durumu kaydet
            </button>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              Mevcut: {STATUS_LABELS[ticket.status] ?? ticket.status}
            </span>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Yazışma</h2>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {ticket.messages.map((m) => (
                <li
                  key={m.id}
                  style={{
                    borderLeft:
                      m.authorKind === "staff"
                        ? "3px solid var(--accent, #2563eb)"
                        : "3px solid var(--border)",
                    paddingLeft: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                      marginBottom: 4,
                    }}
                  >
                    {m.authorKind === "staff" ? "Lerta destek" : "Müşteri"} ·{" "}
                    {formatWhen(m.createdAt)}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
                </li>
              ))}
            </ul>
          </div>

          {ticket.status !== "resolved" ? (
            <form className="card" style={{ marginTop: 16 }} onSubmit={onReply}>
              <label htmlFor="reply">Lerta yanıtı</label>
              <textarea
                id="reply"
                className="input"
                rows={4}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                required
              />
              <button className="btn" type="submit" disabled={loading}>
                Müşteriye gönder
              </button>
            </form>
          ) : (
            <p style={{ marginTop: 16, color: "var(--muted)" }}>
              Talep kapatılmış. Yeniden açmak için durumu «Açık» yapın.
            </p>
          )}
        </>
      ) : null}
    </ConsoleShell>
  );
}
