"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ModulePageShell } from "../../../components/ModulePageShell";
import { TrustReviewInvitesPanel } from "../../../components/trust/TrustReviewInvitesPanel";
import { TrustStarRating } from "../../../components/trust/TrustStarRating";
import { useWebSession } from "../../../context/WebSessionProvider";
import {
  TrustCompanyProfile,
  TrustScoreApiClient,
} from "../../../lib/TrustScoreApiClient";
import {
  TRUST_REVIEW_HIGHLIGHTS,
  trustParticipantLabel,
} from "../../../lib/trustCenterLabels";

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TrustDistribution({
  distribution,
  reviewCount,
}: {
  distribution: TrustCompanyProfile["distribution"];
  reviewCount: number;
}) {
  const max = Math.max(...distribution.map((d) => d.count), 1);
  return (
    <div className="trust-distribution" aria-label="Puan dağılımı">
      {distribution
        .slice()
        .reverse()
        .map((bucket) => {
          const pct = reviewCount === 0 ? 0 : Math.round((bucket.count / reviewCount) * 100);
          const width = reviewCount === 0 ? 0 : (bucket.count / max) * 100;
          return (
            <div key={bucket.scoreValue} className="trust-distribution-row">
              <span className="trust-distribution-label">{bucket.scoreValue}</span>
              <div className="trust-distribution-track">
                <div
                  className="trust-distribution-fill"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="trust-distribution-meta">
                {bucket.count} · {pct}%
              </span>
            </div>
          );
        })}
    </div>
  );
}

export function TrustPageClient() {
  const searchParams = useSearchParams();
  const initialCompanyId = searchParams.get("companyId") ?? "";
  const { accessToken, locale, session } = useWebSession();
  const [trustCompanyId, setTrustCompanyId] = useState(initialCompanyId);
  const [trustScore, setTrustScore] = useState(5);
  const [trustComment, setTrustComment] = useState("Güvenilir taşıma partneri");
  const [highlights, setHighlights] = useState<string[]>(["Zamanında teslim", "İletişim"]);
  const [profile, setProfile] = useState<TrustCompanyProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const ownCompanyId = session?.companyId ?? "";

  async function loadProfile(companyId: string): Promise<void> {
    if (!companyId.trim()) {
      setErrorMessage("Firma kimliği girin.");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const payload = await TrustScoreApiClient.fetchProfile(companyId.trim());
      setProfile(payload.snapshot);
      setTrustCompanyId(companyId.trim());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Skor hatası");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitTrust(): Promise<void> {
    if (!trustCompanyId.trim()) {
      setErrorMessage("Firma kimliği girin.");
      return;
    }
    if (!accessToken) {
      setErrorMessage("Değerlendirme için giriş yapın.");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    const prefix =
      highlights.length > 0 ? `[${highlights.join(" · ")}] ` : "";
    const commentText = `${prefix}${trustComment.trim()}`;
    try {
      await TrustScoreApiClient.submitReview(
        accessToken,
        locale,
        trustCompanyId.trim(),
        trustScore,
        commentText,
      );
      setSuccessMessage("Değerlendirmeniz kaydedildi.");
      await loadProfile(trustCompanyId.trim());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gönderim hatası");
    }
  }

  useEffect(() => {
    if (!initialCompanyId.trim()) {
      return;
    }
    void loadProfile(initialCompanyId.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial deep link only
  }, [initialCompanyId]);

  const stats = useMemo(
    () => [
      {
        value: profile ? profile.scoreValue.toFixed(1) : "—",
        label: "Ortalama puan",
      },
      {
        value: profile ? String(profile.reviewCount) : "0",
        label: "B2B değerlendirme",
      },
      {
        value: profile?.trustProfileActive ? "Aktif" : "Standart",
        label: "Güven profili paketi",
        highlight: Boolean(profile?.trustProfileActive),
      },
    ],
    [profile],
  );

  function toggleHighlight(tag: string): void {
    setHighlights((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  }

  return (
    <div className="trust-center-premium">
      <ModulePageShell
        eyebrow="Güven"
        title="Güven merkezi"
        lead="Tamamlanan taşıma ve ihale iş birliklerinden sonra partner firmaları B2B olarak değerlendirin. Skorlar marketplace, mesajlar ve ihale bağlamında görünür."
        stats={stats}
        action={
          ownCompanyId ? (
            <button
              type="button"
              className="btn-outline-header trust-hero-action"
              onClick={() => void loadProfile(ownCompanyId)}
            >
              Kendi firmamın profili
            </button>
          ) : null
        }
      >
        {errorMessage ? <p className="error banner error--light">{errorMessage}</p> : null}
        {successMessage ? <p className="success banner">{successMessage}</p> : null}

        <TrustReviewInvitesPanel
          accessToken={accessToken}
          onSelectCompany={(companyId) => {
            setTrustCompanyId(companyId);
            void loadProfile(companyId);
          }}
        />

        <div className="trust-premium-grid">
          <section className="trust-premium-panel trust-premium-panel--profile">
            <div className="trust-panel-head">
              <h2 className="trust-panel-title">Firma güven profili</h2>
              <p className="trust-panel-sub">
                ID marketplace, ihale veya mesajlardan otomatik doldurulabilir.
              </p>
            </div>

            <label className="trust-field">
              <span className="trust-field-label">Firma ID</span>
              <input
                className="trust-field-input"
                value={trustCompanyId}
                onChange={(event) => setTrustCompanyId(event.target.value)}
                placeholder="UUID — «Güven profili» linkinden"
              />
            </label>
            <button
              type="button"
              className="btn-accent trust-load-btn"
              disabled={loading}
              onClick={() => void loadProfile(trustCompanyId)}
            >
              {loading ? "Yükleniyor…" : "Profili getir"}
            </button>

            {profile ? (
              <div className="trust-profile-card">
                <div className="trust-profile-head">
                  <div>
                    <h3 className="trust-profile-name">{profile.legalName}</h3>
                    <p className="trust-profile-meta">
                      {trustParticipantLabel(profile.participantTypeCode)} ·{" "}
                      {profile.countryCode}
                      {profile.trustProfileActive ? (
                        <span className="trust-badge trust-badge--verified">Doğrulanmış paket</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="trust-profile-score-ring">
                    <span className="trust-profile-score-num">
                      {profile.scoreValue.toFixed(1)}
                    </span>
                    <span className="trust-profile-score-of">/ 5</span>
                  </div>
                </div>
                <TrustStarRating value={profile.scoreValue} readOnly size="lg" />
                <TrustDistribution
                  distribution={profile.distribution ?? []}
                  reviewCount={profile.reviewCount}
                />
                <div className="trust-profile-links">
                  <Link
                    className="trust-inline-link"
                    href="/messaging?tab=sohbet"
                  >
                    Mesajlaşmada aç
                  </Link>
                  <Link className="trust-inline-link" href="/marketplace">
                    Marketplace
                  </Link>
                </div>
              </div>
            ) : (
              <p className="trust-empty-hint">
                Profil önizlemesi için firma ID girin. Sohbet başlığındaki «Güven» rozeti buraya
                yönlendirir.
              </p>
            )}

            {profile && profile.recentReviews.length > 0 ? (
              <div className="trust-reviews-feed">
                <h3 className="trust-feed-title">Son B2B yorumlar</h3>
                <ul className="trust-feed-list">
                  {profile.recentReviews.map((review, index) => (
                    <li key={`${review.createdAt}-${index}`} className="trust-feed-item">
                      <div className="trust-feed-item-head">
                        <TrustStarRating value={review.scoreValue} readOnly />
                        <time dateTime={review.createdAt}>{formatReviewDate(review.createdAt)}</time>
                      </div>
                      <p className="trust-feed-comment">{review.commentText}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="trust-premium-panel trust-premium-panel--review">
            <div className="trust-panel-head">
              <h2 className="trust-panel-title">Değerlendirme gönder</h2>
              <p className="trust-panel-sub">
                Firma başına bir kurumsal değerlendirme (güncelleme yapılabilir). Kendi
                firmanızı puanlayamazsınız.
              </p>
            </div>

            <div className="trust-star-picker">
              <span className="trust-field-label">Genel puan</span>
              <TrustStarRating value={trustScore} onChange={setTrustScore} size="lg" />
            </div>

            <div className="trust-highlights">
              <span className="trust-field-label">Öne çıkanlar (isteğe bağlı)</span>
              <div className="trust-highlight-chips">
                {TRUST_REVIEW_HIGHLIGHTS.map((tag) => {
                  const active = highlights.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={
                        active ? "trust-chip trust-chip--on" : "trust-chip"
                      }
                      onClick={() => toggleHighlight(tag)}
                      aria-pressed={active}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="trust-field">
              <span className="trust-field-label">Yorum</span>
              <textarea
                className="trust-field-input trust-field-textarea"
                rows={5}
                value={trustComment}
                onChange={(event) => setTrustComment(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="btn-accent trust-submit-btn"
              onClick={() => void handleSubmitTrust()}
            >
              Değerlendirmeyi yayınla
            </button>

            <p className="trust-legal-hint">
              Değerlendirmeler yalnızca kayıtlı B2B kullanıcılar içindir; uyuşmazlık durumunda
              platform denetim kaydına tabidir.
            </p>
          </section>
        </div>
      </ModulePageShell>
    </div>
  );
}
