"use client";

import { IconDownload, IconShieldLock } from "./ChatUiIcons";
import { messagingAttachmentLimitSummary } from "../../lib/messagingAttachmentPolicy";
import type { MessagingChatController } from "../../hooks/useMessagingChatController";

type Props = {
  chat: MessagingChatController;
  kvkkHubHref?: string;
};

/** EK-M4: ek limitleri, legal hold uyarısı, şirket sahibi KVKK dışa aktarma. */
export function MessagingChatComplianceStrip({ chat, kvkkHubHref }: Props) {
  const { activeThread, isCompanyOwner, isBusy, handleExportArchive } = chat;
  const legalHold = Boolean(activeThread?.legalHoldAt);

  return (
    <div className="messaging-chat-compliance-strip" role="region" aria-label="Sohbet uyumluluk">
      <p className="messaging-chat-compliance-policy module-hint">
        {messagingAttachmentLimitSummary()}. Mesaj düzenleme/silme işlemleri denetim
        kaydına yazılır.
      </p>
      {legalHold ? (
        <p className="messaging-chat-compliance-legal-hold" role="status">
          <IconShieldLock size={16} aria-hidden />
          <span>
            <strong>Legal hold</strong> — bu sohbette mesaj silme kapalı; eDiscovery
            saklama aktif
            {activeThread?.legalHoldAt
              ? ` (${new Date(activeThread.legalHoldAt).toLocaleString("tr-TR")})`
              : ""}
            .
          </span>
        </p>
      ) : null}
      {isCompanyOwner ? (
        kvkkHubHref ? (
          <a className="messaging-chat-compliance-export" href={kvkkHubHref}>
            <IconDownload size={16} aria-hidden />
            KVKK &amp; saklama
          </a>
        ) : (
          <button
            type="button"
            className="messaging-chat-compliance-export"
            disabled={isBusy}
            onClick={() => void handleExportArchive()}
          >
            <IconDownload size={16} aria-hidden />
            KVKK şirket arşivi (JSON)
          </button>
        )
      ) : null}
    </div>
  );
}
