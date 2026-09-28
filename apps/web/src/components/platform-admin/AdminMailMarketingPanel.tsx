"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PlatformAdminApiClient,
  type EmailMarketingCampaignRecord,
  type EmailMarketingSegmentRecord,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminMailMarketingPanel() {
  const { accessToken } = useWebSession();
  const [segments, setSegments] = useState<EmailMarketingSegmentRecord[]>([]);
  const [campaigns, setCampaigns] = useState<EmailMarketingCampaignRecord[]>(
    [],
  );
  const [selectedSegmentId, setSelectedSegmentId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [subjectA, setSubjectA] = useState("");
  const [subjectB, setSubjectB] = useState("");
  const [abEnabled, setAbEnabled] = useState(false);
  const [htmlBody, setHtmlBody] = useState(
    "<p>Merhaba,</p><p>Lerta platform güncellemeleri…</p>",
  );
  const [textBody, setTextBody] = useState("Merhaba,\n\nLerta platform güncellemeleri…");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<
    Awaited<ReturnType<typeof PlatformAdminApiClient.fetchCampaignAnalytics>> | null
  >(null);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const [seg, camp] = await Promise.all([
      PlatformAdminApiClient.fetchMarketingSegments(accessToken),
      PlatformAdminApiClient.fetchMarketingCampaigns(accessToken),
    ]);
    setSegments(seg);
    setCampaigns(camp);
    if (!selectedSegmentId && seg[0]?.id) {
      setSelectedSegmentId(seg[0].id);
    }
  }, [accessToken, selectedSegmentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createCampaign(): Promise<void> {
    if (!accessToken || !selectedSegmentId || !campaignName.trim()) {
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await PlatformAdminApiClient.createMarketingCampaign(accessToken, {
        name: campaignName.trim(),
        segmentId: selectedSegmentId,
        subjectA,
        subjectB: abEnabled ? subjectB : undefined,
        abTestEnabled: abEnabled,
        htmlBody,
        textBody,
      });
      setMessage("Kampanya taslağı oluşturuldu.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  async function sendCampaign(id: string): Promise<void> {
    if (!accessToken) {
      return;
    }
    setBusy(true);
    try {
      await PlatformAdminApiClient.sendMarketingCampaign(accessToken, id);
      setMessage("Kampanya kuyruğa alındı.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gönderim hatası");
    } finally {
      setBusy(false);
    }
  }

  async function loadAnalytics(id: string): Promise<void> {
    if (!accessToken) {
      return;
    }
    setAnalyticsId(id);
    const data = await PlatformAdminApiClient.fetchCampaignAnalytics(
      accessToken,
      id,
    );
    setAnalytics(data);
  }

  return (
    <div className="pa-mail-marketing">
      <section className="pa-panel">
        <h2 className="pa-panel-title">Pazarlama e-postası (Mailchimp sınıfı)</h2>
        <p className="pa-panel-lead">
          Segment + kampanya + A/B konu satırı. Gönderim transactional outbox
          üzerinden; açılma/tıklama analitik sekmesinde görünür.
        </p>
        {message ? <p className="module-hint">{message}</p> : null}
        <label className="pa-field">
          <span>Segment</span>
          <select
            className="input-light"
            value={selectedSegmentId}
            onChange={(event) => setSelectedSegmentId(event.target.value)}
          >
            {segments.map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.name}
              </option>
            ))}
          </select>
        </label>
        <label className="pa-field">
          <span>Kampanya adı</span>
          <input
            className="input-light"
            value={campaignName}
            onChange={(event) => setCampaignName(event.target.value)}
          />
        </label>
        <label className="pa-field">
          <span>Konu (A)</span>
          <input
            className="input-light"
            value={subjectA}
            onChange={(event) => setSubjectA(event.target.value)}
          />
        </label>
        <label className="pa-field">
          <input
            type="checkbox"
            checked={abEnabled}
            onChange={(event) => setAbEnabled(event.target.checked)}
          />
          A/B test (konu B)
        </label>
        {abEnabled ? (
          <label className="pa-field">
            <span>Konu (B)</span>
            <input
              className="input-light"
              value={subjectB}
              onChange={(event) => setSubjectB(event.target.value)}
            />
          </label>
        ) : null}
        <label className="pa-field">
          <span>HTML gövde</span>
          <textarea
            className="input-light"
            rows={5}
            value={htmlBody}
            onChange={(event) => setHtmlBody(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="pa-btn pa-btn--primary"
          disabled={busy}
          onClick={() => void createCampaign()}
        >
          Taslak oluştur
        </button>
      </section>

      <section className="pa-panel">
        <h2 className="pa-panel-title">Kampanyalar</h2>
        <ul className="pa-simple-list">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <strong>{campaign.name}</strong> — {campaign.status}
              {campaign.abTestEnabled ? " · A/B" : ""}
              {campaign.status === "draft" ? (
                <button
                  type="button"
                  className="pa-btn pa-btn--secondary"
                  disabled={busy}
                  onClick={() => void sendCampaign(campaign.id)}
                >
                  Gönder
                </button>
              ) : null}
              {campaign.status === "sent" ? (
                <button
                  type="button"
                  className="pa-btn pa-btn--ghost"
                  onClick={() => void loadAnalytics(campaign.id)}
                >
                  Analitik
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {analytics && analyticsId ? (
          <div className="pa-metric-row">
            <article className="pa-metric">
              <p className="pa-metric-label">Gönderim</p>
              <p className="pa-metric-value">{analytics.sent}</p>
            </article>
            <article className="pa-metric">
              <p className="pa-metric-label">Açılma</p>
              <p className="pa-metric-value">
                {analytics.openRatePercent ?? "—"}%
              </p>
            </article>
            <article className="pa-metric">
              <p className="pa-metric-label">Tıklama</p>
              <p className="pa-metric-value">
                {analytics.clickRatePercent ?? "—"}%
              </p>
            </article>
            {analytics.abVariants.length > 1 ? (
              <ul>
                {analytics.abVariants.map((variant) => (
                  <li key={variant.variant}>
                    Varyant {variant.variant}: açılma{" "}
                    {variant.openRatePercent ?? "—"}% · tıklama{" "}
                    {variant.clickRatePercent ?? "—"}%
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
