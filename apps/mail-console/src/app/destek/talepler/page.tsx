"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  createSupportTicket,
  fetchSupportTickets,
  isPlatformOperator,
  type MailSupportTicketSummary,
  type MailSupportTicketTopic,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

const TOPIC_OPTIONS: { value: MailSupportTicketTopic; label: string }[] = [
  { value: "technical", label: "Teknik destek" },
  { value: "billing", label: "Faturalama" },
  { value: "sales", label: "Satış / plan" },
  { value: "general", label: "Genel" },
];

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

export default function SupportTicketsPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [tickets, setTickets] = useState<MailSupportTicketSummary[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [topic, setTopic] = useState<MailSupportTicketTopic>("technical");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [domain, setDomain] = useState("");

  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const data = await fetchSupportTickets(accessToken);
    setTickets(data.tickets);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login?next=/destek/talepler");
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        setOperator(await isPlatformOperator(accessToken));
        await reload();
        setError("");
      } catch {
        setError("Talepler yüklenemedi.");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, reload, router]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { ticket } = await createSupportTicket(accessToken, {
        topic,
        subject: subject.trim(),
        message: body.trim(),
        domain: domain.trim() || undefined,
      });
      setMessage(`Talep #${ticket.publicRef} oluşturuldu.`);
      setShowForm(false);
      setSubject("");
      setBody("");
      setDomain("");
      await reload();
      router.push(`/destek/talepler/${ticket.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Talep oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConsoleShell operator={operator}>
      <h1>Destek talepleri</h1>
      <p style={{ color: "var(--muted)", maxWidth: 720 }}>
        Teknik, faturalama ve genel sorularınızı buradan iletin. İş günlerinde
        e-posta kanalıyla aynı SLA hedefleri geçerlidir.
      </p>

      {error ? (
        <p className="error-banner" style={{ marginTop: 16 }}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p style={{ marginTop: 16, color: "var(--muted)" }}>{message}</p>
      ) : null}

      <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Formu kapat" : "Yeni talep"}
        </button>
      </div>

      {showForm ? (
        <form className="card" style={{ marginTop: 16 }} onSubmit={onCreate}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Yeni destek talebi</h2>
          <label htmlFor="topic">Konu</label>
          <select
            id="topic"
            className="input"
            value={topic}
            onChange={(e) => setTopic(e.target.value as MailSupportTicketTopic)}
          >
            {TOPIC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label htmlFor="subject">Başlık</label>
          <input
            id="subject"
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            required
          />
          <label htmlFor="domain">İlgili domain (isteğe bağlı)</label>
          <input
            id="domain"
            className="input"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="ornek.com"
          />
          <label htmlFor="message">Mesaj</label>
          <textarea
            id="message"
            className="input"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <button className="btn" type="submit" disabled={loading}>
            Gönder
          </button>
        </form>
      ) : null}

      <div className="card" style={{ marginTop: 24, overflowX: "auto" }}>
        {loading && tickets.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Yükleniyor…</p>
        ) : tickets.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            Henüz talep yok. «Yeni talep» ile başlayın veya{" "}
            <a href="https://www.lerta.com.tr/iletisim">vitrin iletişim</a>{" "}
            formunu kullanın.
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <th style={{ padding: "8px 6px" }}>Ref</th>
                <th style={{ padding: "8px 6px" }}>Konu</th>
                <th style={{ padding: "8px 6px" }}>Başlık</th>
                <th style={{ padding: "8px 6px" }}>Durum</th>
                <th style={{ padding: "8px 6px" }}>Güncelleme</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td style={{ padding: "8px 6px" }}>
                    <Link href={`/destek/talepler/${t.id}`}>#{t.publicRef}</Link>
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    {TOPIC_OPTIONS.find((o) => o.value === t.topic)?.label ??
                      t.topic}
                  </td>
                  <td style={{ padding: "8px 6px" }}>{t.subject}</td>
                  <td style={{ padding: "8px 6px" }}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    {formatWhen(t.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ConsoleShell>
  );
}
