"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ModulePageShell } from "../../../components/ModulePageShell";
import { useWebSession } from "../../../context/WebSessionProvider";
import { TrustScoreApiClient, TrustScoreRecord } from "../../../lib/TrustScoreApiClient";

function TrustStars({ scoreValue }: { scoreValue: number }) {
  return (
    <div className="trust-stars" aria-label={`Puan ${scoreValue} / 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= Math.round(scoreValue) ? "trust-star trust-star--on" : "trust-star"}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function TrustPageClient() {
  const searchParams = useSearchParams();
  const initialCompanyId = searchParams.get("companyId") ?? "";
  const { accessToken, locale } = useWebSession();
  const [trustCompanyId, setTrustCompanyId] = useState(initialCompanyId);
  const [trustScore, setTrustScore] = useState(5);
  const [trustComment, setTrustComment] = useState("Güvenilir taşıma partneri");
  const [trustSnapshot, setTrustSnapshot] = useState<TrustScoreRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleLoadTrust(): Promise<void> {
    if (!trustCompanyId.trim()) {
      setErrorMessage("Firma kimliği girin.");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const payload = await TrustScoreApiClient.fetchSnapshot(trustCompanyId.trim());
      setTrustSnapshot(payload.snapshot);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Skor hatası");
      setTrustSnapshot(null);
    }
  }

  async function handleSubmitTrust(): Promise<void> {
    if (!trustCompanyId.trim()) {
      setErrorMessage("Firma kimliği girin.");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await TrustScoreApiClient.submitReview(
        accessToken,
        locale,
        trustCompanyId.trim(),
        trustScore,
        trustComment.trim(),
      );
      setSuccessMessage("Değerlendirmeniz kaydedildi.");
      await handleLoadTrust();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gönderim hatası");
    }
  }

  useEffect(() => {
    if (!initialCompanyId.trim()) {
      return;
    }
    void TrustScoreApiClient.fetchSnapshot(initialCompanyId.trim())
      .then((payload) => setTrustSnapshot(payload.snapshot))
      .catch(() => setTrustSnapshot(null));
  }, [initialCompanyId]);

  return (
    <ModulePageShell
      eyebrow="Güven"
      title="Güven merkezi"
      lead="Partner firmaların ortalama puanını görün ve tamamlanan taşımalardan sonra değerlendirme bırakın."
      stats={[
        {
          value: trustSnapshot ? trustSnapshot.scoreValue.toFixed(1) : "—",
          label: "Seçili firma puanı",
        },
        {
          value: trustSnapshot ? String(trustSnapshot.reviewCount) : "0",
          label: "Değerlendirme sayısı",
        },
        { value: "1–5", label: "Puan skalası", highlight: true },
      ]}
    >
      {errorMessage ? <p className="error banner error--light">{errorMessage}</p> : null}
      {successMessage ? <p className="success banner">{successMessage}</p> : null}

      <div className="trust-layout">
        <section className="module-panel trust-lookup">
          <h2 className="module-panel-title">Firma güven profili</h2>
          <label className="label-light">
            Firma ID
            <input
              className="input-light"
              value={trustCompanyId}
              onChange={(event) => setTrustCompanyId(event.target.value)}
              placeholder="Marketplace mesajından veya ilandan"
            />
          </label>
          <button type="button" className="btn-accent" onClick={() => void handleLoadTrust()}>
            Profili getir
          </button>

          {trustSnapshot ? (
            <div className="trust-score-card">
              <TrustStars scoreValue={trustSnapshot.scoreValue} />
              <p className="trust-score-value">{trustSnapshot.scoreValue.toFixed(1)} / 5</p>
              <p className="trust-score-meta">
                {trustSnapshot.reviewCount} değerlendirme · ID:{" "}
                {trustSnapshot.companyId.slice(0, 12)}…
              </p>
            </div>
          ) : (
            <p className="muted muted--dark module-hint">
              Firma ID girip profili getirin. Marketplace’te «Güven profili» hızlı doldurur.
            </p>
          )}
        </section>

        <section className="module-panel trust-review">
          <h2 className="module-panel-title">Değerlendirme gönder</h2>
          <label className="label-light">
            Puan (1–5)
            <input
              className="input-light"
              type="number"
              min={1}
              max={5}
              value={trustScore}
              onChange={(event) => setTrustScore(Number(event.target.value))}
            />
          </label>
          <label className="label-light">
            Yorum
            <textarea
              className="input-light trust-textarea"
              rows={4}
              value={trustComment}
              onChange={(event) => setTrustComment(event.target.value)}
            />
          </label>
          <button type="button" className="btn-accent" onClick={() => void handleSubmitTrust()}>
            Değerlendirmeyi yayınla
          </button>
        </section>
      </div>
    </ModulePageShell>
  );
}
