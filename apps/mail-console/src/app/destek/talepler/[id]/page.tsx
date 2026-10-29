"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  fetchSupportTicket,
  isPlatformOperator,
  replySupportTicket,
  type MailSupportTicketDetail,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

const STATUS_LABELS: Record<string, string> = {
  open: "Açık",
  waiting_customer: "Yanıtınız bekleniyor",
  resolved: "Çözüldü",
};

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

export default function SupportTicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = typeof params.id === "string" ? params.id : "";
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [ticket, setTicket] = useState<MailSupportTicketDetail | null>(null);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!accessToken || !ticketId) {
      return;
    }
    const data = await fetchSupportTicket(accessToken, ticketId);
    setTicket(data.ticket);
  }, [accessToken, ticketId]);

  useEffect(() => {
    if (!accessToken) {
      router.replace(
        `/login?next=${encodeURIComponent(`/destek/talepler/${ticketId}`)}`,
      );
      return;
    }
    if (!ticketId) {
      router.replace("/destek/talepler");
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        setOperator(await isPlatformOperator(accessToken));
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
    if (!accessToken || !ticketId || ticket?.status === "resolved") {
      return;
    }
    setError("");
    setLoading(true);
    try {
      await replySupportTicket(accessToken, ticketId, reply.trim());
      setReply("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yanıt gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConsoleShell operator={operator}>
      <p style={{ marginTop: 0 }}>
        <Link href="/destek/talepler">← Tüm talepler</Link>
      </p>

      {loading && !ticket ? (
        <p style={{ color: "var(--muted)" }}>Yükleniyor…</p>
      ) : null}

      {error ? (
        <p className="error-banner" style={{ marginTop: 16 }}>
          {error}
        </p>
      ) : null}

      {ticket ? (
        <>
          <h1>
            #{ticket.publicRef} — {ticket.subject}
          </h1>
          <p style={{ color: "var(--muted)" }}>
            Durum: {STATUS_LABELS[ticket.status] ?? ticket.status}
            {ticket.domainName ? ` · Domain: ${ticket.domainName}` : ""}
            {" · "}
            Oluşturma: {formatWhen(ticket.createdAt)}
          </p>

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
                    {m.authorKind === "staff" ? "Lerta destek" : "Siz"} ·{" "}
                    {formatWhen(m.createdAt)}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
                </li>
              ))}
            </ul>
          </div>

          {ticket.status === "resolved" ? (
            <p style={{ marginTop: 16, color: "var(--muted)" }}>
              Bu talep kapatılmış. Yeni bir konu için{" "}
              <Link href="/destek/talepler">yeni talep</Link> açın.
            </p>
          ) : (
            <form className="card" style={{ marginTop: 16 }} onSubmit={onReply}>
              <label htmlFor="reply">Ek bilgi / yanıt</label>
              <textarea
                id="reply"
                className="input"
                rows={4}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                required
              />
              <button className="btn" type="submit" disabled={loading}>
                Gönder
              </button>
            </form>
          )}
        </>
      ) : null}
    </ConsoleShell>
  );
}
