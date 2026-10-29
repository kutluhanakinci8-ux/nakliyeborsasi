"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  fetchOperatorSupportTickets,
  isPlatformOperator,
  type MailSupportTicketOperatorSummary,
  type MailSupportTicketTopic,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

const STATUS_LABELS: Record<string, string> = {
  open: "Açık",
  waiting_customer: "Müşteri yanıtı bekleniyor",
  resolved: "Çözüldü",
};

const TOPIC_OPTIONS: { value: "" | MailSupportTicketTopic; label: string }[] = [
  { value: "", label: "Tüm konular" },
  { value: "technical", label: "Teknik" },
  { value: "billing", label: "Faturalama" },
  { value: "sales", label: "Satış" },
  { value: "general", label: "Genel" },
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

export default function OperatorSupportTicketsPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [denied, setDenied] = useState(false);
  const [tickets, setTickets] = useState<MailSupportTicketOperatorSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [topicFilter, setTopicFilter] = useState<"" | MailSupportTicketTopic>("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [appliedTopic, setAppliedTopic] = useState<"" | MailSupportTicketTopic>("");
  const [appliedCompany, setAppliedCompany] = useState("");

  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const data = await fetchOperatorSupportTickets(accessToken, {
        topic: appliedTopic || undefined,
        company: appliedCompany || undefined,
      });
      setTickets(data.tickets);
      setError("");
    } catch {
      setError("Talepler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, appliedCompany, appliedTopic]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login?next=/operator/destek");
      return;
    }
    void (async () => {
      const ok = await isPlatformOperator(accessToken);
      if (!ok) {
        setDenied(true);
        return;
      }
      await reload();
    })();
  }, [accessToken, appliedCompany, appliedTopic, reload, router]);

  function onFilterSubmit(event: FormEvent) {
    event.preventDefault();
    setAppliedTopic(topicFilter);
    setAppliedCompany(companyFilter.trim());
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
        <Link href="/operator">← Operatör özeti</Link>
      </p>
      <h1>Operatör — destek talepleri</h1>
      <p style={{ color: "var(--muted)", maxWidth: 720 }}>
        Müşteri konsolundan açılan ticket&apos;lar. Lerta yanıtı talep
        sahibine e-posta ile gider.
      </p>

      <form
        className="card"
        style={{
          marginTop: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "flex-end",
        }}
        onSubmit={onFilterSubmit}
      >
        <div>
          <label htmlFor="topic-filter">Konu</label>
          <select
            id="topic-filter"
            className="input"
            value={topicFilter}
            onChange={(e) =>
              setTopicFilter(e.target.value as "" | MailSupportTicketTopic)
            }
          >
            {TOPIC_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label htmlFor="company-filter">Firma (unvan veya org id)</label>
          <input
            id="company-filter"
            className="input"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            placeholder="Örn. Lerta veya UUID"
          />
        </div>
        <button type="submit" className="btn secondary">
          Filtrele
        </button>
      </form>

      {error ? (
        <p className="error-banner" style={{ marginTop: 16 }}>
          {error}
        </p>
      ) : null}

      <div className="card" style={{ marginTop: 24, overflowX: "auto" }}>
        {loading && tickets.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Yükleniyor…</p>
        ) : tickets.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            Filtreye uyan talep yok.
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
                <th style={{ padding: "8px 6px" }}>Firma</th>
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
                    <Link href={`/operator/destek/${t.id}`}>#{t.publicRef}</Link>
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    {TOPIC_OPTIONS.find((o) => o.value === t.topic)?.label ??
                      t.topic}
                  </td>
                  <td style={{ padding: "8px 6px" }}>{t.companyLegalName}</td>
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
