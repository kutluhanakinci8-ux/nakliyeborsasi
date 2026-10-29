"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  fetchOperatorSupportTickets,
  isPlatformOperator,
  type MailSupportTicketOperatorSummary,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

const STATUS_LABELS: Record<string, string> = {
  open: "Açık",
  waiting_customer: "Müşteri yanıtı bekleniyor",
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

export default function OperatorSupportTicketsPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [denied, setDenied] = useState(false);
  const [tickets, setTickets] = useState<MailSupportTicketOperatorSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setLoading(true);
      try {
        const data = await fetchOperatorSupportTickets(accessToken);
        setTickets(data.tickets);
        setError("");
      } catch {
        setError("Talepler yüklenemedi.");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, router]);

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
        Müşteri konsolundan açılan ticket&apos;lar. Yanıt gönderildiğinde durum
        otomatik «müşteri yanıtı bekleniyor» olur.
      </p>

      {error ? (
        <p className="error-banner" style={{ marginTop: 16 }}>
          {error}
        </p>
      ) : null}

      <div className="card" style={{ marginTop: 24, overflowX: "auto" }}>
        {loading && tickets.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Yükleniyor…</p>
        ) : tickets.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Açık talep yok.</p>
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
