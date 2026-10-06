"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMailOpsSnapshot, type MailOpsSnapshot } from "@/lib/mailApi";

type Props = {
  accessToken: string;
  highlightRunbook?: boolean;
};

export function MailOpsSnapshotPanel({
  accessToken,
  highlightRunbook = false,
}: Props) {
  const [snapshot, setSnapshot] = useState<MailOpsSnapshot | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const payload = await fetchMailOpsSnapshot(accessToken);
      setSnapshot(payload.snapshot);
    } catch {
      setError("Ops özeti yüklenemedi.");
      setSnapshot(null);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!highlightRunbook || !snapshot) {
      return;
    }
    document
      .getElementById("mail-ops-runbooks")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightRunbook, snapshot]);

  if (error) {
    return <p className="login-error">{error}</p>;
  }
  if (!snapshot) {
    return <p>Yükleniyor…</p>;
  }

  return (
    <div className="mail-ops-snapshot-panel">
      {highlightRunbook ? (
        <p className="mail-parity-assist-banner" role="status">
          Kurumsal posta ops: canlı snapshot + doğrulama scriptleri. Platform
          operatör JWT ile tam communications snapshot ayrı uçtan alınır (MP-5
          runbook).
        </p>
      ) : null}
      <p className="mail-settings-lead">
        Organizasyon posta durumu — {snapshot.generatedAt} · faz{" "}
        <code>{snapshot.phaseCode}</code>
      </p>
      <h4 className="mail-deliverability-subhead">IMAP / maildir</h4>
      <ul>
        <li>Etkin: {snapshot.imap.enabled ? "evet" : "hayır"}</li>
        <li>Sağlık API: <code>{snapshot.imap.imapHealthPath}</code></li>
      </ul>
      <h4 className="mail-deliverability-subhead">Teslimat (7g)</h4>
      <ul>
        <li>Skor: {snapshot.deliverability.score}/100</li>
        <li>Gönderim: {snapshot.deliverability.sentInPeriod}</li>
        <li>
          Bounce: {snapshot.deliverability.bounceRatePercent ?? "—"}%
        </li>
        <li>Webhook uç: {snapshot.deliverability.webhookEndpointCount}</li>
      </ul>
      <h4 className="mail-deliverability-subhead">Entegrasyon</h4>
      <ul>
        <li>JMAP köprü: {snapshot.integration.jmap.bridge ? "açık" : "kapalı"}</li>
        <li>
          AI compose:{" "}
          {snapshot.integration.aiComposeEnabled ? "etkin" : "kapalı"}
        </li>
      </ul>
      <h4
        id="mail-ops-runbooks"
        className={
          highlightRunbook
            ? "mail-deliverability-subhead mail-deliverability-subhead--focus"
            : "mail-deliverability-subhead"
        }
      >
        Runbook &amp; smoke
      </h4>
      <ul className="mail-deliverability-hints">
        {snapshot.runbooks.map((book) => (
          <li key={book.id}>
            <strong>{book.id}</strong> — <code>{book.docPath}</code>
            {book.verifyScript ? (
              <>
                {" "}
                · doğrula: <code>{book.verifyScript}</code>
              </>
            ) : null}
          </li>
        ))}
        <li>
          Ekolojik public status:{" "}
          <code>{snapshot.ekolojikPublicStatusPath}</code>
        </li>
      </ul>
      <button type="button" className="compose-btn compose-btn--secondary" onClick={() => void load()}>
        Yenile
      </button>
    </div>
  );
}
