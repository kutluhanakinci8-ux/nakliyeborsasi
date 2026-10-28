import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import {
  fetchPublicMailStatus,
  statusLabelTr,
} from "@/lib/publicStatus";
import {
  buildStatusDisplayGroups,
  groupOverallStatus,
} from "@/lib/statusPageGroups";
import { SUPPORT_EMAIL } from "@/lib/marketingSite";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Canlı durum — Lerta",
  description:
    "Lerta Posta, Mesaj ve platform bileşenlerinin güncel sağlık durumu.",
};

const API_STATUS_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://yonetim.lerta.com.tr/api/v1") +
  "/public/lerta-mail/status";

export default async function DurumPage() {
  let page: Awaited<ReturnType<typeof fetchPublicMailStatus>> | null = null;
  let error = false;
  try {
    page = await fetchPublicMailStatus();
  } catch {
    error = true;
  }

  const subscribeSubject = encodeURIComponent("Durum bildirimi aboneliği");
  const subscribeBody = encodeURIComponent(
    "Merhaba,\n\nPlanlı bakım ve kesinti duyuruları için e-posta listesine eklenmek istiyorum.\n\nFirma / alan adı:\nİletişim e-postası:\n",
  );

  return (
    <MarketingPageShell contentClassName="platform-content--product-vitrin platform-content--status-page">
      <nav className="breadcrumb breadcrumb--premium" aria-label="Breadcrumb">
        <Link href="/">Lerta</Link>
        <span aria-hidden="true">/</span>
        <Link href="/destek">Destek</Link>
        <span aria-hidden="true">/</span>
        <span>Canlı durum</span>
      </nav>

      <h1 className="section-title section-title--lg">Canlı durum</h1>
      <p className="pricing-lead">
        Lerta Posta, Mesaj ve platform bileşenleri. Önerilen kısa adres:{" "}
        <code>status.lerta.com.tr</code> → bu sayfa. SLA: <Link href="/sla">/sla</Link>.
      </p>

      {error || !page ? (
        <p className="status-page-error">
          Durum bilgisi şu an alınamadı. Birkaç dakika sonra yenileyin veya{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      ) : (
        <>
          <div className={`status-banner status-${page.overall}`} role="status">
            <strong>{page.overallLabelTr}</strong>
            <span className="status-banner__time">
              Güncelleme (İstanbul):{" "}
              {new Date(page.updatedAt).toLocaleString("tr-TR", {
                timeZone: "Europe/Istanbul",
              })}
            </span>
          </div>
          {page.messageTr ? <p className="status-notice">{page.messageTr}</p> : null}

          {buildStatusDisplayGroups(page).map((group) => {
            const groupStatus = groupOverallStatus(group.components);
            return (
              <section key={group.id} className="status-group" aria-labelledby={`sg-${group.id}`}>
                <div className="status-group__head">
                  <h2 id={`sg-${group.id}`} className="status-group__title">
                    {group.titleTr}
                  </h2>
                  <span className={`status-pill status-${groupStatus}`}>
                    {statusLabelTr(groupStatus)}
                  </span>
                </div>
                {group.leadTr ? <p className="status-group__lead">{group.leadTr}</p> : null}
                <table className="sla-table status-table">
                  <thead>
                    <tr>
                      <th scope="col">Bileşen</th>
                      <th scope="col">Durum</th>
                      <th scope="col">Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.components.map((row) => (
                      <tr key={row.id}>
                        <td>{row.nameTr}</td>
                        <td>
                          <span className={`status-pill status-${row.status}`}>
                            {statusLabelTr(row.status)}
                          </span>
                        </td>
                        <td className="status-table__note">{row.descriptionTr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {group.syntheticNoteTr ? (
                  <p className="status-group__note">{group.syntheticNoteTr}</p>
                ) : null}
              </section>
            );
          })}
        </>
      )}

      <section className="status-subscribe" aria-labelledby="status-subscribe-title">
        <h2 id="status-subscribe-title" className="destek-section-title">
          Durum bildirimi
        </h2>
        <p className="status-subscribe__lead">
          Planlı bakım ve kesinti duyuruları için e-posta listesine kayıt (manuel onay). RSS/API:{" "}
          <a href={API_STATUS_URL} rel="noopener noreferrer">
            JSON durum API
          </a>
          .
        </p>
        <div className="status-subscribe__actions">
          <a
            className="btn btn-primary posta-btn-primary"
            href={`mailto:${SUPPORT_EMAIL}?subject=${subscribeSubject}&body=${subscribeBody}`}
          >
            Abonelik talebi (e-posta)
          </a>
          <Link className="btn btn-ghost posta-btn-secondary" href="/iletisim?konu=teknik">
            İletişim formu
          </Link>
        </div>
      </section>
    </MarketingPageShell>
  );
}
