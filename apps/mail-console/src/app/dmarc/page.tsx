"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  fetchMailDmarcPanel,
  isPlatformOperator,
  type MailDmarcPanel,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

export default function DmarcPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [panel, setPanel] = useState<MailDmarcPanel | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const data = await fetchMailDmarcPanel(accessToken, 30);
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
        await reload();
      } catch {
        setError("DMARC raporları yüklenemedi.");
      }
    })();
  }, [accessToken, reload, router]);

  return (
    <ConsoleShell operator={operator}>
      <h1>DMARC (rua)</h1>
      <p style={{ color: "var(--muted)", maxWidth: 640 }}>
        Aggregate rapor özetleri — domain bazında son 30 gün. Raporlar{" "}
        <code>rua=mailto:dmarc@…</code> adresine gelen XML dosyalarından
        platform tarafından içe aktarılır.
      </p>
      {error ? <p className="login-error">{error}</p> : null}
      {!panel ? (
        <p>Yükleniyor…</p>
      ) : panel.domains.length === 0 ? (
        <p>
          Henüz rapor yok. DNS DMARC kaydında rua adresini doğrulayın; ilk
          raporlar genelde 24–48 saat içinde gelir.
        </p>
      ) : (
        panel.domains.map((block) => (
          <section key={block.domain} className="card" style={{ marginBottom: 24 }}>
            <h2>{block.domain}</h2>
            <div className="stat-row">
              <div className="stat-card">
                <strong>{block.totals.messageCount}</strong>
                <span>Mesaj (dönem)</span>
              </div>
              <div className="stat-card">
                <strong>{block.totals.dkimPass}</strong>
                <span>DKIM pass</span>
              </div>
              <div className="stat-card">
                <strong>{block.totals.spfPass}</strong>
                <span>SPF pass</span>
              </div>
              <div className="stat-card">
                <strong>{block.totals.dispositionReject}</strong>
                <span>Reject</span>
              </div>
            </div>
            {block.reports.length === 0 ? (
              <p>Bu domain için rapor kaydı yok.</p>
            ) : (
              <table className="console-table">
                <thead>
                  <tr>
                    <th>Dönem bitiş</th>
                    <th>Mesaj</th>
                    <th>none / quar / rej</th>
                    <th>DKIM</th>
                    <th>SPF</th>
                    <th>Raporlayan</th>
                  </tr>
                </thead>
                <tbody>
                  {block.reports.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {new Date(row.periodEnd).toLocaleDateString("tr-TR")}
                      </td>
                      <td>{row.messageCount}</td>
                      <td>
                        {row.disposition.none} / {row.disposition.quarantine} /{" "}
                        {row.disposition.reject}
                      </td>
                      <td>
                        {row.dkim.pass} / {row.dkim.fail}
                      </td>
                      <td>
                        {row.spf.pass} / {row.spf.fail}
                      </td>
                      <td>{row.reporterOrgName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))
      )}
    </ConsoleShell>
  );
}
