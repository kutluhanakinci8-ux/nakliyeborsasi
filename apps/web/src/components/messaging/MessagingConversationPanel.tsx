"use client";

import { Fragment, useEffect, useState } from "react";
import { SocialHubApiClient } from "../../lib/SocialHubApiClient";
import type { SocialHubOutboundDelivery } from "../../lib/socialHubTypes";
import Link from "next/link";
import { ChatMessageBody } from "./ChatMessageBody";
import { MessagingChatAttachmentPreview } from "./MessagingChatAttachmentPreview";
import { ChatMessageActionBar } from "./ChatMessageActionBar";
import { EmptyState } from "../EmptyState";
import { MessagingApiClient } from "../../lib/MessagingApiClient";
import {
  companyInitials,
  dayKeyFromIso,
  formatChatDayLabel,
  groupParticipantRoleLabel,
  operationStampLabel,
} from "../../lib/messagingChatUi";
import {
  MESSAGING_ATTACHMENT_MAX_COUNT,
  messagingAttachmentAttachTitle,
} from "../../lib/messagingAttachmentPolicy";
import { messageHasActiveMentionQuery, shortCompanyId } from "../../lib/messagingPageHelpers";
import {
  IconChannels,
  IconLockNote,
  IconMessageSquare,
  IconPaperclip,
  IconSend,
  IconSparkles,
  IconStickyNote,
  IconTemplate,
  IconUsers,
} from "./ChatUiIcons";
import type { MessagingChatController } from "../../hooks/useMessagingChatController";
import type { ChatConversationBackgroundId } from "../../lib/messagingChatBackground";
import type { AuthSessionRecord } from "../../lib/SessionApiClient";

type Props = {
  chat: MessagingChatController;
  accessToken: string;
  locale: string;
  session: AuthSessionRecord | null;
  chatBackgroundId: ChatConversationBackgroundId;
};

export function MessagingConversationPanel({
  chat,
  accessToken,
  locale,
  session,
  chatBackgroundId,
}: Props) {
  const {
    activeThreadId,
    setActiveThreadId,
    activeThread,
    mobileThreadOpen,
    setMobileThreadOpen,
    groupParticipants,
    listingCard,
    counterpartyTrust,
    acceptOfferBusy,
    isBusy,
    acceptListingFixedPrice,
    contextPinCollapsed,
    setContextPinCollapsed,
    threadSummary,
    offerTimeline,
    offerTimelineOpen,
    setOfferTimelineOpen,
    llmSummary,
    llmBusy,
    refreshLlmSummary,
    internalNotesOnly,
    setInternalNotesOnly,
    displayedMessages,
    companyLabelById,
    scrollToMessageId,
    mentionNameByUserId,
    translations,
    translateBusyId,
    stampBusyId,
    handleOperationStamp,
    handleTranslateMessage,
    setQuotedMessage,
    setEditMessage,
    setDeleteMessageId,
    quotedMessage,
    composeDragActive,
    setComposeDragActive,
    addPendingFiles,
    internalNote,
    setInternalNote,
    typingHint,
    pendingAttachments,
    setPendingAttachments,
    colleagues,
    mentionDropdownOpen,
    mentionSuggestions,
    mentionPickIndex,
    setMentionMenuOpen,
    setMentionPickIndex,
    applyColleagueMention,
    typingPingRef,
    isCompanyOwner,
    quickReplyAdminBusy,
    openQuickReplyAdmin,
    channelSettingsOpen,
    setChannelSettingsOpen,
    quickReplies,
    templateSelectRef,
    messageBody,
    setMessageBody,
    messageInputRef,
    handleSendMessage,
    setErrorMessage,
  } = chat;
  const [threadDeliveries, setThreadDeliveries] = useState<
    SocialHubOutboundDelivery[]
  >([]);

  useEffect(() => {
    if (
      !accessToken ||
      !activeThreadId ||
      activeThread?.threadKind !== "external_social"
    ) {
      setThreadDeliveries([]);
      return;
    }
    void SocialHubApiClient.fetchDeliveryLog(accessToken, {
      threadId: activeThreadId,
      limit: 8,
    })
      .then(setThreadDeliveries)
      .catch(() => setThreadDeliveries([]));
  }, [accessToken, activeThreadId, activeThread?.threadKind, chat.messages.length]);

  const threadLegalHold = Boolean(activeThread?.legalHoldAt);

  return (
          <section className="chat-main module-panel chat-main--premium">
            <div className="chat-main-header">
              {mobileThreadOpen && activeThreadId ? (
                <button
                  type="button"
                  className="chat-mobile-back"
                  onClick={() => {
                    setMobileThreadOpen(false);
                    setActiveThreadId("");
                  }}
                >
                  ← Sohbetler
                </button>
              ) : null}
              <h2 className="module-panel-title">
                {activeThread
                  ? activeThread.threadKind === "group"
                    ? activeThread.title?.trim() ||
                      activeThread.counterpartyLegalName?.trim() ||
                      "Grup sohbet"
                    : activeThread.counterpartyLegalName?.trim() ||
                      shortCompanyId(activeThread.counterpartyCompanyId)
                  : "Mesaj kutusu"}
              </h2>
              {activeThread?.threadKind === "group" &&
              groupParticipants.length > 0 ? (
                <ul
                  className="chat-group-participants"
                  aria-label="Grup katılımcıları"
                >
                  {groupParticipants.map((row) => (
                    <li key={row.companyId} className="chat-group-participant">
                      <span className="chat-group-participant-name">
                        {row.legalName ?? row.companyId.slice(0, 8)}
                      </span>
                      <span className="chat-group-participant-role">
                        {groupParticipantRoleLabel(row.participantRole)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {activeThread?.threadKind === "external_social" ? (
              <div className="chat-social-channel-banner" role="status">
                <span className="chat-social-channel-label">
                  {activeThread.externalChannelLabel ?? "Sosyal kanal"}
                </span>
                {activeThread.externalOutboundStatus === "failed" &&
                activeThread.externalOutboundError ? (
                  <p className="chat-social-outbound-error">
                    Son kanal gönderimi başarısız: {activeThread.externalOutboundError}
                  </p>
                ) : activeThread.externalOutboundStatus === "ok" ? (
                  <p className="chat-social-outbound-ok">Son yanıt kanala iletildi.</p>
                ) : (
                  <p className="module-hint">
                    Yanıtlar bağlı hesap üzerinden gönderilir.
                  </p>
                )}
                {threadDeliveries.length > 0 ? (
                  <ul className="chat-social-delivery-log" aria-label="Gönderim geçmişi">
                    {threadDeliveries.map((row) => (
                      <li key={row.id}>
                        <time dateTime={row.createdAt}>
                          {new Date(row.createdAt).toLocaleString("tr-TR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </time>
                        {" — "}
                        {row.status === "ok" ? "Kanala iletildi" : row.errorMessage}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {activeThreadId &&
            (listingCard ||
              (counterpartyTrust && activeThread?.threadKind !== "group")) ? (
              <div className="chat-context-pin" aria-label="İş bağlamı">
                <button
                  type="button"
                  className="chat-context-pin-toggle"
                  aria-expanded={!contextPinCollapsed}
                  onClick={() => setContextPinCollapsed((value) => !value)}
                >
                  İş bağlamı {contextPinCollapsed ? "▸" : "▾"}
                </button>
                {!contextPinCollapsed ? (
                  <div className="chat-context-pin-body">
                    {listingCard ? (
                      <div className="chat-listing-card chat-listing-card--inline">
                        <p className="chat-listing-card-route">
                          {listingCard.routeLabel}
                        </p>
                        <p className="chat-listing-card-meta">
                          {listingCard.equipmentTypeCode} ·{" "}
                          {listingCard.weightTonnes} t · yükleme{" "}
                          {listingCard.loadingDateStart}
                          {listingCard.priceAmount
                            ? ` · ${listingCard.priceAmount} ${listingCard.priceCurrencyCode}`
                            : ""}
                        </p>
                        {listingCard.priceAmount ? (
                          <button
                            type="button"
                            className="btn-account-primary chat-listing-accept-btn"
                            disabled={acceptOfferBusy || isBusy}
                            onClick={() => void acceptListingFixedPrice()}
                          >
                            {acceptOfferBusy
                              ? "Kabul ediliyor…"
                              : "Sabit fiyatı kabul et"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {counterpartyTrust &&
                    activeThread?.threadKind !== "group" ? (
                      <div className="chat-trust-row">
                        <span
                          className="chat-trust-badge"
                          title="Lerta güven skoru"
                        >
                          Güven {counterpartyTrust.scoreValue.toFixed(1)}
                          {counterpartyTrust.reviewCount > 0
                            ? ` · ${counterpartyTrust.reviewCount} değerlendirme`
                            : ""}
                        </span>
                        <Link
                          className="chat-trust-link"
                          href={`/trust?companyId=${encodeURIComponent(
                            activeThread?.counterpartyCompanyId ?? "",
                          )}`}
                        >
                          Profil
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            {threadSummary ? (
              <aside className="chat-summary-panel" aria-label="Sohbet özet">
                <p className="chat-summary-title">{threadSummary.headline}</p>
                <ul className="chat-summary-list">
                  {threadSummary.bullets.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {offerTimeline.length > 0 ? (
                  <div className="chat-offer-timeline-wrap">
                    <button
                      type="button"
                      className="chat-offer-timeline-toggle"
                      aria-expanded={offerTimelineOpen}
                      onClick={() => setOfferTimelineOpen((open) => !open)}
                    >
                      Teklif geçmişi ({offerTimeline.length})
                    </button>
                    {offerTimelineOpen ? (
                      <ul
                        className="chat-offer-timeline"
                        aria-label="Teklif zaman çizelgesi"
                      >
                        {offerTimeline.map((entry) => (
                          <li key={`${entry.at}-${entry.label}`}>
                            <time dateTime={entry.at}>
                              {new Date(entry.at).toLocaleString(locale, {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </time>
                            <span>
                              {entry.label}
                              {entry.amountText ? ` · ${entry.amountText}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                {llmSummary ? (
                  <p className="chat-llm-summary">{llmSummary}</p>
                ) : null}
                <div className="chat-summary-actions">
                  <button
                    type="button"
                    className="chat-summary-ai-btn"
                    disabled={llmBusy}
                    onClick={() => void refreshLlmSummary()}
                  >
                    <IconSparkles size={17} />
                    <span>
                      {llmBusy ? "AI özet…" : "AI özet (KVKK onaylı)"}
                    </span>
                  </button>
                </div>
                <p className="chat-summary-meta">
                  Yapılandırılmış özet · {threadSummary.messageCount} mesaj
                </p>
              </aside>
            ) : null}
            {threadLegalHold ? (
              <p className="chat-legal-hold-inline" role="status">
                Legal hold — mesaj silme kapalı; işlemler denetim kaydında.
              </p>
            ) : null}
            <div className="chat-messages-toolbar">
              <button
                type="button"
                className={
                  internalNotesOnly
                    ? "chat-internal-filter-btn chat-internal-filter-btn--active"
                    : "chat-internal-filter-btn"
                }
                aria-pressed={internalNotesOnly}
                onClick={() => setInternalNotesOnly((value) => !value)}
              >
                <IconStickyNote size={16} />
                <span>İç notlar</span>
              </button>
            </div>
            <div className="chat-messages" data-chat-bg={chatBackgroundId}>
              {displayedMessages.length === 0 ? (
                <EmptyState
                  message={
                    internalNotesOnly
                      ? "Bu sohbette iç not yok."
                      : "Soldan sohbet seçin veya yeni sohbet açın."
                  }
                />
              ) : (
                <ul className="chat-message-list">
                  {displayedMessages.map((message, messageIndex) => {
                    const isMine =
                      session?.companyId &&
                      message.senderCompanyId === session.companyId;
                    const dayKey = dayKeyFromIso(message.createdAt);
                    const prevDay =
                      messageIndex > 0
                        ? dayKeyFromIso(
                            displayedMessages[messageIndex - 1].createdAt,
                          )
                        : "";
                    const showDay = dayKey !== prevDay;
                    const companyLabel =
                      companyLabelById.get(message.senderCompanyId) ??
                      shortCompanyId(message.senderCompanyId);
                    const bubbleClass = [
                      "chat-bubble",
                      isMine ? "chat-bubble--mine" : "",
                      message.messageKind === "internal"
                        ? "chat-bubble--internal"
                        : "",
                      scrollToMessageId === message.id
                        ? "chat-bubble--highlight"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const readers =
                      message.readByCounterpartyReaders ??
                      (message.readByCounterpartyUserIds ?? []).map(
                        (userId) => ({
                          userId,
                          displayName: userId.slice(0, 8),
                        }),
                      );
                    return (
                      <Fragment key={message.id}>
                        {showDay ? (
                          <li
                            key={`day-${dayKey}`}
                            className="chat-day-separator"
                            aria-hidden
                          >
                            {formatChatDayLabel(message.createdAt, locale)}
                          </li>
                        ) : null}
                        <li
                          key={message.id}
                          id={`chat-msg-${message.id}`}
                          className={bubbleClass}
                        >
                          <div className="chat-bubble-row">
                            <span
                              className={
                                isMine
                                  ? "chat-avatar chat-avatar--mine"
                                  : "chat-avatar"
                              }
                              aria-hidden
                            >
                              {companyInitials(companyLabel)}
                            </span>
                            <div className="chat-bubble-content">
                        <span className="chat-bubble-meta">
                          {isMine ? "Siz" : companyLabel} ·{" "}
                          {new Date(message.createdAt).toLocaleString(locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {isMine ? (
                            <span
                              className={
                                message.readByRecipient
                                  ? "chat-read-ticks chat-read-ticks--read"
                                  : "chat-read-ticks"
                              }
                              title={
                                readers.length > 0
                                  ? `Okuyan: ${readers
                                      .map((row) => row.displayName)
                                      .join(", ")}`
                                  : message.readByRecipient
                                    ? "Karşı firma gördü"
                                    : "Henüz okunmadı"
                              }
                            >
                              {message.readByRecipient ? " ✓✓" : " ✓"}
                            </span>
                          ) : null}
                          {message.messageKind === "internal" ? (
                            <span className="chat-internal-tag"> İç not</span>
                          ) : null}
                          {message.editedAt ? <> · düzenlendi</> : null}
                        </span>
                        <ChatMessageBody
                          text={message.bodyText}
                          mentionNameByUserId={mentionNameByUserId}
                        />
                        {message.operationStamps &&
                        message.operationStamps.length > 0 ? (
                          <ul
                            className="chat-message-stamps"
                            aria-label="İşlem damgaları"
                          >
                            {message.operationStamps.map((stamp) => (
                              <li
                                key={`${stamp.stampedByCompanyId}-${stamp.stampType}-${stamp.createdAt}`}
                                className={`chat-message-stamp chat-message-stamp--${stamp.stampType}`}
                              >
                                {operationStampLabel(stamp.stampType)}
                                <span className="chat-message-stamp-by">
                                  {stamp.stampedByDisplayName}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {message.attachments && message.attachments.length > 0 ? (
                          <ul className="chat-attachment-list">
                            {message.attachments.map((attachment) => (
                              <li key={attachment.index}>
                                {activeThreadId ? (
                                  <MessagingChatAttachmentPreview
                                    accessToken={accessToken}
                                    locale={locale}
                                    threadId={activeThreadId}
                                    messageId={message.id}
                                    attachmentIndex={attachment.index}
                                    contentType={attachment.contentType}
                                    filename={attachment.filename}
                                    sizeBytes={attachment.sizeBytes}
                                    onError={(msg) => setErrorMessage(msg)}
                                  />
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {translations[message.id] ? (
                          <p className="chat-translation">
                            {translations[message.id]}
                          </p>
                        ) : null}
                        <ChatMessageActionBar
                          isMine={Boolean(isMine)}
                          deleted={Boolean(message.deleted)}
                          isInternal={message.messageKind === "internal"}
                          translateBusy={translateBusyId === message.id}
                          stampBusy={stampBusyId === message.id}
                          onReply={() =>
                            setQuotedMessage({
                              id: message.id,
                              preview: message.bodyText.slice(0, 240),
                            })
                          }
                          onStamp={(stampType) =>
                            void handleOperationStamp(message.id, stampType)
                          }
                          onTranslate={(target) =>
                            void handleTranslateMessage(message, target)
                          }
                          onEdit={() =>
                            setEditMessage({
                              id: message.id,
                              bodyText: message.bodyText,
                            })
                          }
                          onDelete={
                            threadLegalHold
                              ? undefined
                              : () => setDeleteMessageId(message.id)
                          }
                        />
                            </div>
                          </div>
                        </li>
                      </Fragment>
                    );
                  })}
                </ul>
              )}
            </div>
            <div
              className={[
                "chat-compose-dock",
                internalNote ? "chat-compose-dock--internal" : "",
                composeDragActive ? "chat-compose-dock--drag" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onDragOver={(event) => {
                event.preventDefault();
                if (activeThreadId) {
                  setComposeDragActive(true);
                }
              }}
              onDragLeave={() => setComposeDragActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setComposeDragActive(false);
                if (event.dataTransfer.files.length > 0) {
                  void addPendingFiles(event.dataTransfer.files);
                }
              }}
            >
              {quotedMessage ? (
                <div className="chat-quote-preview" role="status">
                  <span className="chat-quote-preview-label">Yanıt</span>
                  <p className="chat-quote-preview-text">
                    {quotedMessage.preview}
                  </p>
                  <button
                    type="button"
                    className="chat-quote-preview-remove"
                    aria-label="Alıntıyı kaldır"
                    onClick={() => setQuotedMessage(null)}
                  >
                    ×
                  </button>
                </div>
              ) : null}
              {internalNote ? (
                <p className="chat-compose-internal-banner" role="status">
                  İç not modu — yalnızca şirketiniz görür, karşı tarafa gitmez.
                </p>
              ) : null}
              {typingHint ? (
                <p className="chat-typing-hint" aria-live="polite">
                  {typingHint}
                </p>
              ) : null}
              {pendingAttachments.length > 0 ? (
                <ul className="chat-pending-attachments">
                  {pendingAttachments.map((file) => (
                    <li key={file.filename} className="chat-pending-chip">
                      {file.previewUrl ? (
                        <img
                          className="chat-pending-thumb"
                          src={file.previewUrl}
                          alt=""
                        />
                      ) : file.contentType.includes("pdf") ? (
                        <span className="chat-pending-pdf" aria-hidden>
                          PDF
                        </span>
                      ) : null}
                      <span className="chat-pending-chip-name" title={file.filename}>
                        📎 {file.filename}
                      </span>
                      <button
                        type="button"
                        className="chat-pending-chip-remove"
                        aria-label={`${file.filename} kaldır`}
                        onClick={() =>
                          setPendingAttachments((current) =>
                            current.filter((row) => row.filename !== file.filename),
                          )
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="chat-compose-toolbar">
                <div
                  className="chat-compose-mode"
                  role="group"
                  aria-label="Mesaj türü"
                >
                  <button
                    type="button"
                    className={
                      internalNote
                        ? "chat-compose-mode-btn"
                        : "chat-compose-mode-btn chat-compose-mode-btn--active"
                    }
                    aria-pressed={!internalNote}
                    disabled={!activeThreadId}
                    title="Karşı firmaya"
                    onClick={() => setInternalNote(false)}
                  >
                    <IconMessageSquare size={16} />
                    <span className="chat-compose-mode-label">Karşı firma</span>
                  </button>
                  <button
                    type="button"
                    className={
                      internalNote
                        ? "chat-compose-mode-btn chat-compose-mode-btn--active chat-compose-mode-btn--internal"
                        : "chat-compose-mode-btn"
                    }
                    aria-pressed={internalNote}
                    disabled={!activeThreadId}
                    title="İç not"
                    onClick={() => setInternalNote(true)}
                  >
                    <IconLockNote size={16} />
                    <span className="chat-compose-mode-label">İç not</span>
                  </button>
                </div>
                <div className="chat-compose-toolbar-actions">
                  {colleagues.length > 0 ? (
                    <div className="chat-mention-anchor">
                      <button
                        type="button"
                        className="chat-compose-tool-btn"
                        disabled={!activeThreadId}
                        aria-expanded={mentionDropdownOpen}
                        aria-haspopup="listbox"
                        title="Ekip etiketle"
                        onClick={() => setMentionMenuOpen((open) => !open)}
                      >
                        <IconUsers size={16} />
                        <span className="sr-only">Ekip etiketle</span>
                      </button>
                      {mentionDropdownOpen ? (
                        <ul
                          className="chat-mention-menu"
                          role="listbox"
                          aria-label="Ekip üyesi etiketle"
                        >
                          {mentionSuggestions.length === 0 ? (
                            <li className="chat-mention-menu-empty">
                              Eşleşen ekip üyesi yok
                            </li>
                          ) : (
                            mentionSuggestions.map((colleague, index) => (
                              <li
                                key={colleague.userId}
                                role="option"
                                aria-selected={index === mentionPickIndex}
                              >
                                <button
                                  type="button"
                                  className={
                                    index === mentionPickIndex
                                      ? "chat-mention-menu-item chat-mention-menu-item--active"
                                      : "chat-mention-menu-item"
                                  }
                                  onMouseDown={(event) =>
                                    event.preventDefault()
                                  }
                                  onClick={() =>
                                    applyColleagueMention(colleague)
                                  }
                                >
                                  <span className="chat-mention-menu-name">
                                    {colleague.displayName}
                                  </span>
                                  <span className="chat-mention-menu-hint">
                                    etiketle
                                  </span>
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                  {isCompanyOwner ? (
                    <>
                      <button
                        type="button"
                        className="chat-compose-tool-btn"
                        disabled={quickReplyAdminBusy}
                        title="Şablon yönet"
                        onClick={() => void openQuickReplyAdmin()}
                      >
                        <IconTemplate size={16} />
                        <span className="sr-only">Şablon yönet</span>
                      </button>
                      <button
                        type="button"
                        className="chat-compose-tool-btn"
                        aria-expanded={channelSettingsOpen}
                        title="Kanallar"
                        onClick={() =>
                          setChannelSettingsOpen((open) => !open)
                        }
                      >
                        <IconChannels size={16} />
                        <span className="sr-only">Kanallar</span>
                      </button>
                    </>
                  ) : null}
                  {quickReplies.length > 0 ? (
                    <label className="chat-compose-template">
                      <span className="sr-only">Hazır şablon</span>
                      <select
                        ref={templateSelectRef}
                        id="chat-quick-reply"
                        className="chat-compose-template-select"
                        defaultValue=""
                        disabled={!activeThreadId}
                        onChange={(event) => {
                          const id = event.target.value;
                          if (!id) {
                            return;
                          }
                          const template = quickReplies.find(
                            (row) => row.id === id,
                          );
                          if (template) {
                            setMessageBody(template.bodyText);
                            messageInputRef.current?.focus();
                          }
                          event.target.value = "";
                        }}
                      >
                        <option value="">Şablon…</option>
                        {quickReplies.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.labelTr}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              </div>
              <div className="chat-compose-editor">
                <label
                  className="chat-compose-attach"
                  title={messagingAttachmentAttachTitle()}
                >
                  <IconPaperclip className="chat-compose-attach-icon" />
                  <span className="sr-only">Dosya ekle</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf,text/plain,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    disabled={
                      !activeThreadId ||
                      pendingAttachments.length >= MESSAGING_ATTACHMENT_MAX_COUNT
                    }
                    onChange={(event) => {
                      const files = event.target.files;
                      event.target.value = "";
                      if (files && files.length > 0) {
                        void addPendingFiles(files);
                      }
                    }}
                  />
                </label>
                <textarea
                  ref={messageInputRef}
                  className="chat-compose-textarea"
                  aria-label={
                    internalNote
                      ? "Ekip içi not yazın"
                      : "Karşı firmaya mesaj yazın"
                  }
                  placeholder={
                    internalNote
                      ? "Ekip içi notunuzu yazın…"
                      : "Mesajınızı yazın… (@ ile ekip etiketleyin)"
                  }
                  rows={2}
                  value={messageBody}
                  disabled={!activeThreadId}
                  onChange={(event) => {
                    setMessageBody(event.target.value);
                    if (messageHasActiveMentionQuery(event.target.value)) {
                      setMentionMenuOpen(true);
                    }
                    const now = Date.now();
                    if (activeThreadId && now - typingPingRef.current > 2000) {
                      typingPingRef.current = now;
                      void MessagingApiClient.sendTyping(
                        accessToken,
                        locale,
                        activeThreadId,
                      );
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "/" &&
                      !event.shiftKey &&
                      !messageBody.trim() &&
                      quickReplies.length > 0
                    ) {
                      event.preventDefault();
                      templateSelectRef.current?.focus();
                      return;
                    }
                    if (mentionDropdownOpen && mentionSuggestions.length > 0) {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setMentionPickIndex(
                          (current) =>
                            (current + 1) % mentionSuggestions.length,
                        );
                        return;
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setMentionPickIndex(
                          (current) =>
                            (current - 1 + mentionSuggestions.length) %
                            mentionSuggestions.length,
                        );
                        return;
                      }
                      if (event.key === "Enter" && event.shiftKey === false) {
                        const picked = mentionSuggestions[mentionPickIndex];
                        if (picked && messageHasActiveMentionQuery(messageBody)) {
                          event.preventDefault();
                          applyColleagueMention(picked);
                          return;
                        }
                      }
                    }
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSendMessage();
                    }
                    if (event.key === "Escape") {
                      if (mentionDropdownOpen) {
                        setMentionMenuOpen(false);
                      }
                      if (quotedMessage) {
                        setQuotedMessage(null);
                      }
                    }
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setMentionMenuOpen(false), 160);
                  }}
                />
                <button
                  type="button"
                  className="chat-compose-send"
                  disabled={
                    !activeThreadId ||
                    (!messageBody.trim() && pendingAttachments.length === 0)
                  }
                  title="Gönder"
                  aria-label="Gönder"
                  onClick={() => void handleSendMessage()}
                >
                  <IconSend size={18} />
                </button>
              </div>
              <p className="chat-compose-footnote">
                Enter gönder · Shift+Enter yeni satır
                {colleagues.length > 0 ? " · @ mention" : ""}
                {quickReplies.length > 0 ? " · / şablon" : ""}
                {" · Esc iptal"}
              </p>
            </div>
          </section>
  );
}
