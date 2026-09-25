import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import {
  fetchPublicMailStatus,
  statusLabelTr,
} from "@/lib/publicStatus";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Durum — Lerta Mail",
  description: "Lerta Mail sistem durumu ve bileşen sağlığı.",
};

export default async function DurumPage() {
  let page: Awaited<ReturnType<typeof fetchPublicMailStatus>> | null = null;
  let error = false;
  try {
    page = await fetchPublicMailStatus();
  } catch {
    error = true;
  }

  return (
    <MarketingPageShell narrow>
      <h1>Sistem durumu</h1>
      <p>
        Lerta Mail hizmet bileşenlerinin güncel durumu.{" "}
        <code>status.lerta.com.tr</code> bu sayfaya yönlendirilebilir.
      </p>

      {error || !page ? (
        <p style={{ color: "#fbbf24" }}>
          Durum bilgisi şu an alınamadı. API erişimini kontrol edin veya{" "}
          <a href="mailto:destek@lerta.com.tr">destek@lerta.com.tr</a>.
        </p>
      ) : (
        <>
          <div
            className={`status-banner status-${page.overall}`}
            role="status"
          >
            <strong>{page.overallLabelTr}</strong>
            <span style={{ fontSize: 14, color: "var(--muted)" }}>
              Güncelleme:{" "}
              {new Date(page.updatedAt).toLocaleString("tr-TR", {
                timeZone: "Europe/Istanbul",
              })}
            </span>
          </div>
          {page.messageTr ? (
            <p className="status-notice">{page.messageTr}</p>
          ) : null}
          <table className="sla-table status-table">
            <thead>
              <tr>
                <th>Bileşen</th>
                <th>Durum</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {page.components.map((row) => (
                <tr key={row.id}>
                  <td>{row.nameTr}</td>
                  <td>
                    <span className={`status-pill status-${row.status}`}>
                      {statusLabelTr(row.status)}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 14 }}>
                    {row.descriptionTr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </MarketingPageShell>
  );
}
