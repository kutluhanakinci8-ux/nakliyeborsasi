"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  fetchMailTenantAudit,
  isPlatformOperator,
  type MailTenantAuditEntry,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

export default function AuditPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [logs, setLogs] = useState<MailTenantAuditEntry[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadPage = useCallback(
    async (before?: string, append = false) => {
      if (!accessToken) {
        return;
      }
      setLoading(true);
      try {
        const data = await fetchMailTenantAudit(accessToken, {
          limit: 40,
          before,
        });
        setLogs((prev) =>
          append ? [...prev, ...data.logs] : data.logs,
        );
        setNextBefore(data.nextBefore);
        setError("");
      } catch {
        setError("Denetim kayıtları yüklenemedi.");
      } finally {
        setLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      setOperator(await isPlatformOperator(accessToken));
      await loadPage();
    })();
  }, [accessToken, loadPage, router]);

  return (
    <ConsoleShell operator={operator}>
      <h1>Denetim kaydı</h1>
      <p style={{ color: "var(--muted)", maxWidth: 720 }}>
        Domain, posta kutusu, ekip, teslimat engeli, KVKK ve operatör askı
        işlemleri — kim, ne zaman, ne yaptı.
      </p>

      {error ? (
        <p className="error-banner" style={{ marginTop: 16 }}>{error}</p>
      ) : null}

      <div className="card" style={{ marginTop: 24, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "8px 6px" }}>Zaman</th>
              <th style={{ padding: "8px 6px" }}>Olay</th>
              <th style={{ padding: "8px 6px" }}>Özet</th>
              <th style={{ padding: "8px 6px" }}>Kullanıcı</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 16, color: "var(--muted)" }}>
                  Henüz kayıt yok.
                </td>
              </tr>
            ) : null}
            {logs.map((row) => (
              <tr
                key={row.id}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td style={{ padding: "10px 6px", whiteSpace: "nowrap" }}>
                  {new Date(row.createdAt).toLocaleString("tr-TR")}
                </td>
                <td style={{ padding: "10px 6px" }}>{row.labelTr}</td>
                <td style={{ padding: "10px 6px", color: "var(--muted)" }}>
                  {row.summaryTr || "—"}
                </td>
                <td style={{ padding: "10px 6px" }}>
                  {row.actorEmail ?? "Sistem"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nextBefore ? (
        <button
          type="button"
          className="btn secondary"
          style={{ marginTop: 16 }}
          disabled={loading}
          onClick={() => void loadPage(nextBefore, true)}
        >
          {loading ? "Yükleniyor…" : "Daha eski kayıtlar"}
        </button>
      ) : null}
    </ConsoleShell>
  );
}
