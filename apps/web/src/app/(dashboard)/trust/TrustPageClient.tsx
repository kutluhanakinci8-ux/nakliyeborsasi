"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "../../../components/PageHeader";
import { useWebSession } from "../../../context/WebSessionProvider";
import { TrustScoreApiClient, TrustScoreRecord } from "../../../lib/TrustScoreApiClient";

export function TrustPageClient() {
  const searchParams = useSearchParams();
  const initialCompanyId = searchParams.get("companyId") ?? "";
  const { accessToken, locale } = useWebSession();
  const [trustCompanyId, setTrustCompanyId] = useState(initialCompanyId);
  const [trustScore, setTrustScore] = useState(5);
  const [trustComment, setTrustComment] = useState("Güvenilir taşıma partneri");
  const [trustSnapshot, setTrustSnapshot] = useState<TrustScoreRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLoadTrust(): Promise<void> {
    if (!trustCompanyId.trim()) {
      return;
    }
    try {
      const payload = await TrustScoreApiClient.fetchSnapshot(trustCompanyId.trim());
      setTrustSnapshot(payload.snapshot);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Skor hatası");
    }
  }

  async function handleSubmitTrust(): Promise<void> {
    if (!trustCompanyId.trim()) {
      return;
    }
    try {
      await TrustScoreApiClient.submitReview(
        accessToken,
        locale,
        trustCompanyId.trim(),
        trustScore,
        trustComment.trim(),
      );
      await handleLoadTrust();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gönderim hatası");
    }
  }

  return (
    <>
      <PageHeader
        title="Güven skoru"
        description="Firma değerlendirmeleri ve ortalama puan"
      />
      {errorMessage ? <p className="error banner">{errorMessage}</p> : null}
      <div className="panel-card form-panel">
        <label>
          Firma ID
          <input
            value={trustCompanyId}
            onChange={(event) => setTrustCompanyId(event.target.value)}
          />
        </label>
        <div className="row">
          <button type="button" className="btn-secondary" onClick={() => void handleLoadTrust()}>
            Skoru getir
          </button>
        </div>
        {trustSnapshot ? (
          <div className="stat-row">
            <div className="stat-box">
              <span className="stat-value">{trustSnapshot.scoreValue}</span>
              <span className="stat-label">Ortalama</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{trustSnapshot.reviewCount}</span>
              <span className="stat-label">Değerlendirme</span>
            </div>
          </div>
        ) : null}
        <label>
          Puan (1–5)
          <input
            type="number"
            min={1}
            max={5}
            value={trustScore}
            onChange={(event) => setTrustScore(Number(event.target.value))}
          />
        </label>
        <label>
          Yorum
          <input
            value={trustComment}
            onChange={(event) => setTrustComment(event.target.value)}
          />
        </label>
        <button type="button" className="btn-primary" onClick={() => void handleSubmitTrust()}>
          Değerlendirme gönder
        </button>
      </div>
    </>
  );
}
