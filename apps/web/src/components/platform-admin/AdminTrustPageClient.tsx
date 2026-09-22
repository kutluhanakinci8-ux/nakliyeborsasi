"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlatformAdminApiClient,
  formatParticipantType,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";
import { AdminBarChart, AdminDonutChart } from "./AdminDashboardCharts";

type ReviewRow = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchTrustReviews>
>[number];

type CompanyRow = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchCompanies>
>[number];

type EnrichedReview = ReviewRow & {
  targetLegalName: string;
  authorLegalName: string;
  targetParticipantTypeCode: string | null;
  authorParticipantTypeCode: string | null;
};

type ScoreFilter = "all" | "high" | "mid" | "low";

type SentimentBucket = "high" | "mid" | "low";

type TypeFilter = "all" | "LOAD_SHIPPER" | "LOAD_CARRIER" | "LOAD_SEEKER" | "other";

const SCORE_COLORS: Record<number, string> = {
  5: "#0d9488",
  4: "#2563eb",
  3: "#d97706",
  2: "#f97316",
  1: "#dc2626",
};

function participantKey(code: string | null | undefined): TypeFilter {
  if (code === "LOAD_SHIPPER" || code === "LOAD_CARRIER" || code === "LOAD_SEEKER") {
    return code;
  }
  return "other";
}

function scoreBucket(score: number): SentimentBucket {
  if (score >= 4) {
    return "high";
  }
  if (score === 3) {
    return "mid";
  }
  return "low";
}

function formatScore(score: number): string {
  return `${score} / 5`;
}

function truncateComment(text: string, max = 72): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}…`;
}

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminTrustPageClient() {
  const { accessToken } = useWebSession();
  const [rows, setRows] = useState<EnrichedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedId, setSelectedId] = useState("");

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const [reviews, companies] = await Promise.all([
        PlatformAdminApiClient.fetchTrustReviews(accessToken),
        PlatformAdminApiClient.fetchCompanies(accessToken),
      ]);
      const companyMap = new Map(companies.map((c: CompanyRow) => [c.id, c]));

      const enriched: EnrichedReview[] = reviews.map((review) => {
        const target = companyMap.get(review.targetCompanyId);
        const author = companyMap.get(review.authorCompanyId);
        return {
          ...review,
          targetLegalName:
            target?.legalName ?? `${review.targetCompanyId.slice(0, 8)}…`,
          authorLegalName:
            author?.legalName ?? `${review.authorCompanyId.slice(0, 8)}…`,
          targetParticipantTypeCode: target?.participantTypeCode ?? null,
          authorParticipantTypeCode: author?.participantTypeCode ?? null,
        };
      });

      setRows(enriched);
      setSelectedId((current) => current || enriched[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(() => {
    const byScore = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
    const sentiment = { high: 0, mid: 0, low: 0 };
    const targets = new Set<string>();
    const authors = new Set<string>();
    let sum = 0;

    for (const row of rows) {
      sum += row.scoreValue;
      targets.add(row.targetCompanyId);
      authors.add(row.authorCompanyId);
      switch (row.scoreValue) {
        case 5:
          byScore.s5++;
          break;
        case 4:
          byScore.s4++;
          break;
        case 3:
          byScore.s3++;
          break;
        case 2:
          byScore.s2++;
          break;
        default:
          byScore.s1++;
      }
      sentiment[scoreBucket(row.scoreValue)]++;
    }

    const avg = rows.length > 0 ? sum / rows.length : 0;

    return {
      total: rows.length,
      avg,
      uniqueTargets: targets.size,
      uniqueAuthors: authors.size,
      byScore,
      sentiment,
    };
  }, [rows]);

  const donutSegments = useMemo(
    () =>
      [
        { label: "4–5 puan", value: summary.sentiment.high, color: "#0d9488" },
        { label: "3 puan", value: summary.sentiment.mid, color: "#d97706" },
        { label: "1–2 puan", value: summary.sentiment.low, color: "#dc2626" },
      ].filter((s) => s.value > 0),
    [summary.sentiment],
  );

  const q = filter.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (scoreFilter !== "all" && scoreBucket(row.scoreValue) !== scoreFilter) {
      return false;
    }
    if (
      typeFilter !== "all" &&
      participantKey(row.targetParticipantTypeCode) !== typeFilter
    ) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      row.commentText.toLowerCase().includes(q) ||
      row.targetLegalName.toLowerCase().includes(q) ||
      row.authorLegalName.toLowerCase().includes(q) ||
      row.id.toLowerCase().includes(q)
    );
  });

  const selected = rows.find((r) => r.id === selectedId) ?? filtered[0];

  const scoreFilters: { id: ScoreFilter; label: string }[] = [
    { id: "all", label: "Tüm puanlar" },
    { id: "high", label: "4–5" },
    { id: "mid", label: "3" },
    { id: "low", label: "1–2" },
  ];

  const typeFilters: { id: TypeFilter; label: string }[] = [
    { id: "all", label: "Tüm hedefler" },
    { id: "LOAD_SHIPPER", label: "Yük veren" },
    { id: "LOAD_CARRIER", label: "Taşıyan" },
    { id: "LOAD_SEEKER", label: "Arayan" },
    { id: "other", label: "Diğer" },
  ];

  return (
    <div className="platform-admin-command admin-trust-premium">
      <header className="platform-admin-command-hero">
        <div>
          <p className="platform-admin-command-eyebrow">İtibar ve doğrulama</p>
          <h1 className="platform-admin-command-title">Güven skorları</h1>
          <p className="platform-admin-command-sub">
            Firma değerlendirmeleri — seed ve üye işlemleri
          </p>
        </div>
        <div className="platform-admin-command-hero-meta">
          <span className="admin-status-pill admin-status-pill--ok">
            Ort. {summary.avg.toFixed(1)} / 5
          </span>
          <button type="button" className="admin-btn-ghost-light" onClick={() => void refresh()}>
            Yenile
          </button>
        </div>
      </header>

      <section className="admin-kpi-row admin-trust-kpi-row" aria-label="Güven özet">
        <article className="admin-kpi-card admin-kpi-card--primary">
          <span className="admin-kpi-label">Değerlendirme</span>
          <p className="admin-kpi-value">{summary.total}</p>
          <span className="admin-kpi-hint">Ortalama {summary.avg.toFixed(2)}</span>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Hedef firma</span>
          <p className="admin-kpi-value">{summary.uniqueTargets}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Yazan firma</span>
          <p className="admin-kpi-value">{summary.uniqueAuthors}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Olumlu (4–5)</span>
          <p className="admin-kpi-value">{summary.sentiment.high}</p>
        </article>
        <article className="admin-panel-card admin-org-donut-card">
          {donutSegments.length > 0 ? (
            <AdminDonutChart
              segments={donutSegments}
              centerLabel="Kayıt"
              centerValue={String(summary.total)}
            />
          ) : (
            <p className="platform-admin-empty">Veri yok</p>
          )}
        </article>
      </section>

      <section className="admin-panel-card admin-trust-score-chart">
        <header className="admin-panel-card-head">
          <div>
            <h2>Puan dağılımı</h2>
            <p>1–5 skala (kayıt sayısı)</p>
          </div>
        </header>
        <AdminBarChart
          items={[5, 4, 3, 2, 1].map((score) => {
            const key = `s${score}` as keyof typeof summary.byScore;
            const value = summary.byScore[key];
            return {
              label: `${score} puan`,
              value,
              displayValue: String(value),
              color: SCORE_COLORS[score] ?? "#64748b",
            };
          })}
        />
      </section>

      <div className="admin-org-layout admin-org-layout--premium admin-trust-layout">
        <aside className="admin-org-sidebar admin-panel-card">
          <header className="admin-org-sidebar-head">
            <h2>Değerlendirme dizini</h2>
            <p>{filtered.length} / {rows.length}</p>
          </header>
          <label className="admin-field">
            <span>Ara</span>
            <input
              className="admin-input"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Yorum, firma adı"
            />
          </label>
          <div className="admin-org-type-filters" role="tablist" aria-label="Puan">
            {scoreFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  scoreFilter === item.id
                    ? "admin-org-type-chip active"
                    : "admin-org-type-chip"
                }
                onClick={() => setScoreFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="admin-org-type-filters admin-trust-type-filters">
            {typeFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  typeFilter === item.id
                    ? "admin-org-type-chip active"
                    : "admin-org-type-chip"
                }
                onClick={() => setTypeFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="platform-admin-loading-inline">Liste yükleniyor…</p>
          ) : (
            <ul className="admin-org-company-list admin-org-company-list--premium">
              {filtered.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={
                      selectedId === row.id
                        ? "admin-org-company admin-org-company--premium active"
                        : "admin-org-company admin-org-company--premium"
                    }
                    onClick={() => setSelectedId(row.id)}
                  >
                    <span className="admin-org-company-top">
                      <strong>{row.targetLegalName}</strong>
                      <span
                        className={
                          row.scoreValue >= 4
                            ? "admin-org-badge admin-org-badge--ok"
                            : row.scoreValue <= 2
                              ? "admin-org-badge admin-org-badge--danger"
                              : "admin-org-badge"
                        }
                      >
                        {formatScore(row.scoreValue)}
                      </span>
                    </span>
                    <span className="admin-trust-list-comment">
                      {truncateComment(row.commentText)}
                    </span>
                    <span className="admin-org-company-meta">
                      <span>{row.authorLegalName}</span>
                      <span>{new Date(row.createdAt).toLocaleDateString("tr-TR")}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="admin-org-main">
          {!selected ? (
            <p className="platform-admin-empty">Değerlendirme seçin.</p>
          ) : (
            <>
              <header className="admin-org-detail-hero admin-panel-card">
                <div>
                  <h2>{selected.targetLegalName}</h2>
                  <p className="admin-trust-detail-score">{formatScore(selected.scoreValue)}</p>
                  <div className="admin-org-detail-pills">
                    <span className="admin-org-badge admin-org-badge--ok">
                      Hedef: {formatParticipantType(selected.targetParticipantTypeCode)}
                    </span>
                    <span className="admin-org-badge">
                      Yazan: {formatParticipantType(selected.authorParticipantTypeCode)}
                    </span>
                    <span className="admin-org-badge">{formatReviewDate(selected.createdAt)}</span>
                  </div>
                </div>
                <div className="admin-org-detail-stats admin-users-detail-actions">
                  <Link
                    href={`/admin/organizasyon?firma=${selected.targetCompanyId}`}
                    className="admin-btn-primary"
                  >
                    Hedef firmayı yönet
                  </Link>
                  <Link
                    href={`/admin/organizasyon?firma=${selected.authorCompanyId}`}
                    className="admin-btn-secondary"
                  >
                    Yazan firmayı aç
                  </Link>
                  <Link href="/trust" className="admin-btn-secondary" target="_blank" rel="noreferrer">
                    Üye güven ekranı
                  </Link>
                </div>
              </header>

              <div className="admin-users-detail-grid admin-trust-detail-grid">
                <section className="admin-panel-card admin-users-detail-wide">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Yorum metni</h2>
                      <p>Üyenin bıraktığı değerlendirme</p>
                    </div>
                  </header>
                  <p className="admin-trust-comment-body">
                    {selected.commentText.trim() || "—"}
                  </p>
                </section>

                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Hedef firma</h2>
                      <p>Değerlendirilen organizasyon</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Firma</dt>
                      <dd>{selected.targetLegalName}</dd>
                    </div>
                    <div>
                      <dt>Pazar rolü</dt>
                      <dd>{formatParticipantType(selected.targetParticipantTypeCode)}</dd>
                    </div>
                    <div>
                      <dt>Firma ID</dt>
                      <dd><code>{selected.targetCompanyId}</code></dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Yazan firma</h2>
                      <p>Değerlendirmeyi oluşturan</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Firma</dt>
                      <dd>{selected.authorLegalName}</dd>
                    </div>
                    <div>
                      <dt>Pazar rolü</dt>
                      <dd>{formatParticipantType(selected.authorParticipantTypeCode)}</dd>
                    </div>
                    <div>
                      <dt>Firma ID</dt>
                      <dd><code>{selected.authorCompanyId}</code></dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Kayıt</h2>
                      <p>API kimliği</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Değerlendirme ID</dt>
                      <dd><code>{selected.id}</code></dd>
                    </div>
                    <div>
                      <dt>Puan</dt>
                      <dd>{selected.scoreValue}</dd>
                    </div>
                    <div>
                      <dt>Oluşturulma</dt>
                      <dd>{formatReviewDate(selected.createdAt)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card admin-users-detail-wide">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Operatör notları</h2>
                      <p>Moderasyon ve itibar düzeltmeleri sonraki sürümde</p>
                    </div>
                  </header>
                  <ul className="admin-checklist admin-users-checklist">
                    <li>Organizasyon modülünde güven sekmesi ile profil ayarları eşleşir</li>
                    <li>Demo grafik: TestMarketDemoGraphSeed (API restart)</li>
                    <li>Skor silme / gizleme: platform-admin API genişletmesi gerekir</li>
                  </ul>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
