"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PlatformAdminApiClient,
  type MailRoadmapSnapshot,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminMailRoadmapPanel() {
  const { accessToken } = useWebSession();
  const [snapshot, setSnapshot] = useState<MailRoadmapSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const next = await PlatformAdminApiClient.fetchMailRoadmap(accessToken);
      setSnapshot(next);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading && !snapshot) {
    return <p className="module-hint">Yol haritası yükleniyor…</p>;
  }

  if (!snapshot) {
    return null;
  }

  return (
    <div className="pa-mail-roadmap">
      <section className="pa-panel">
        <h2 className="pa-panel-title">E-posta platformu — A → B → C</h2>
        <p className="pa-panel-lead">
          SMTP profil: <strong>{snapshot.smtpProfile}</strong> · Son kontrol:{" "}
          {new Date(snapshot.checkedAt).toLocaleString("tr-TR")}
        </p>
        <ul className="pa-kv-list">
          <li>
            <span>Domain (Faz B)</span>
            <span>
              {snapshot.counts.verifiedDomains}/{snapshot.counts.mailDomains}{" "}
              doğrulanmış
            </span>
          </li>
          <li>
            <span>Gönderen kimlikleri</span>
            <span>{snapshot.counts.senderIdentities}</span>
          </li>
          <li>
            <span>Mailbox (Faz C)</span>
            <span>{snapshot.counts.mailboxes}</span>
          </li>
        </ul>
      </section>

      {snapshot.phases.map((phase) => (
        <section key={phase.phase} className="pa-panel">
          <h3 className="pa-panel-title">{phase.titleTr}</h3>
          <p className="pa-panel-lead">{phase.summaryTr}</p>
          <p className="module-hint">
            İlerleme: {phase.progressPercent}% · Durum: {phase.status}
          </p>
          <ul className="pa-checklist">
            {phase.nextStepsTr.map((step) => (
              <li key={step} className="pa-checklist-item">
                {step}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
