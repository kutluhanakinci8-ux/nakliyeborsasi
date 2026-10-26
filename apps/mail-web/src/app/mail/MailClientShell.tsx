"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MailComposeMergeFields } from "./MailComposeMergeFields";
import { MailCapInboxEmptyState } from "./MailCapInboxEmptyState";
import { MailIosPwaOnboardingBanner } from "./MailIosPwaOnboardingBanner";
import { MailCampaignResultDialog } from "./MailCampaignResultDialog";
import { MailEmptyState } from "./MailEmptyState";
import { MailShortcutsDialog } from "./MailShortcutsDialog";
import {
  ComposeRichEditor,
  MailCalendarPanel,
  MailCampaignBlockEditor,
  MailCampaignHistoryPanel,
  MailContactsPanel,
  MailSettingsPanel,
} from "./mailLazyPanels";
import { MailPilotBillingNotice } from "./MailPilotBillingNotice";
import { MailReplyQuotePreview } from "./MailReplyQuotePreview";
import { MailComposeRecipientField } from "./MailComposeRecipientField";
import { MailInboxCommandBar } from "./MailInboxCommandBar";
import { MailInboxMessageRow } from "./MailInboxMessageRow";
import { MailListSwipeRow } from "./MailListSwipeRow";
import { MailAppLockOverlay } from "./MailAppLockOverlay";
import type { MailClientController } from "./useMailClientController";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import { connectedTabLabel, inboxSourceBadgeClass, inboxSourceBadgeLabel } from "@/lib/mailInboxSourceUi";
import { formatMailListDate } from "@/lib/mailDisplay";
import { UserCategoryBadge } from "@/lib/mailUserInboxCategoryUi";
import {
  deleteCustomFolder,
  deleteDraft,
  fetchClassifyMessage,
  fetchSummarizeMessage,
  fetchSuggestComposeDraft,
  fetchSuggestReply,
  renameCustomFolder,
  sendDraft,
  unsnoozeMailMessage,
} from "@/lib/mailApi";

type Props = { mail: MailClientController };

export function MailClientShell({ mail }: Props) {
  const { t } = useMailLocale();
  const {
    accessToken,
    activeCustomFolderId,
    activeSwipeRowId,
    activeThreadId,
    aiMailConsent,
    aiSuggestBusy,
    allListSelected,
    applyComposeSignature,
    applyComposeTemplate,
    applyComposeCampaignTemplate,
    applyDelayedSend,
    applyMessageReadLocal,
    applyMessageUserCategoryLocal,
    setMessageUserInboxCategory,
    userInboxCategories,
    refreshUserInboxCategories,
    inboxUserCategoryFilterIds,
    toggleInboxUserCategoryFilter,
    clearInboxUserCategoryFilters,
    canBulkSelect,
    canUseThreads,
    cancelPendingUndo,
    checkboxAnchorRef,
    checkedIds,
    clearRowSelectionAfterSwipe,
    composeBcc,
    composeCc,
    composeError,
    composeFiles,
    composeHtml,
    composeOpen,
    composePreviewBusy,
    composePreviewHtml,
    composeRich,
    composeAiAssistActive,
    composeAiDraftBusy,
    composeShowCcBcc,
    composeSignatures,
    composeStoredAttachments,
    composeSubject,
    composeTemplates,
    composeCampaignTemplates,
    composeText,
    composeTo,
    composeOrgContacts,
    composeMergeReferans,
    composeMergeMusteriAdi,
    composeMergeOpen,
    setComposeMergeReferans,
    setComposeMergeMusteriAdi,
    setComposeMergeOpen,
    insertMergeToken,
    insertReplyMergeToken,
    composeCampaignMode,
    setComposeCampaignMode,
    composeCampaignRecipients,
    setComposeCampaignRecipients,
    maxCampaignRecipients,
    composeCampaignDelayMs,
    setComposeCampaignDelayMs,
    composeCampaignScheduleAt,
    setComposeCampaignScheduleAt,
    composeCampaignSubjectB,
    setComposeCampaignSubjectB,
    composeCampaignHtmlB,
    setComposeCampaignHtmlB,
    composeCampaignDomainAllowlist,
    setComposeCampaignDomainAllowlist,
    composeCampaignNotifyCreator,
    setComposeCampaignNotifyCreator,
    composeCampaignSegmentReferansPrefix,
    setComposeCampaignSegmentReferansPrefix,
    composeCampaignSegmentReferansList,
    setComposeCampaignSegmentReferansList,
    composeCampaignRequireMusteriAdi,
    setComposeCampaignRequireMusteriAdi,
    composeCampaignReminderMinutes,
    setComposeCampaignReminderMinutes,
    composeCampaignTags,
    setComposeCampaignTags,
    composeCampaignSegmentPreview,
    composeCampaignSegmentPreviewBusy,
    runCampaignSegmentPreview,
    applyCampaignClonePayload,
    composeCampaignHistoryOpen,
    setComposeCampaignHistoryOpen,
    campaignResult,
    setCampaignResult,
    importCampaignCsv,
    addInlineComposeImage,
    customFolders,
    deepLinkComposeHandled,
    deepLinkMessageHandled,
    detail,
    detailOffline,
    downloadAttachment,
    draftPreview,
    drafts,
    editingDraftId,
    embedMode,
    embedHubShell,
    shellBrand,
    ensureAiMailConsent,
    getMessageHtmlForRead,
    handleMailPostaPreferencesSaved,
    mailAppLockEnabled,
    setMailAppLockEnabled,
    hasWebAuthnPasskeys,
    setHasWebAuthnPasskeys,
    shouldPromptRemoteImages,
    setRemoteImagesRevealed,
    filteredSent,
    forwardMessageId,
    inboxBranding,
    inboxCustomFolderId,
    inboxFolder,
    inboxListDensity,
    readFontScale,
    inboxOffline,
    inboxOfflineCachedAt,
    isPrimaryInbox,
    listItems,
    focusedInboxEnabled,
    inboxFocusLane,
    setInboxFocusLane,
    inboxQueryFilters,
    toggleInboxQueryFilter,
    clearInboxQueryFilters,
    showInboxLaneAndFilters,
    inboxConnectedSource,
    setInboxConnectedSource,
    showConnectedInboxTabs,
    connectedAccounts,
    listMessageIds,
    listNavigationEnabled,
    logout,
    markCurrentUnread,
    maxAttachmentMb,
    messages,
    mobilePane,
    moveCurrentMessage,
    navigateList,
    openComposeFromDraft,
    openMessage,
    openThread,
    pendingUndo,
    promptCreateCustomFolder,
    previewComposeOutbound,
    closeComposePreview,
    purgeCurrentMessage,
    openSentById,
    restoreCurrentFromTrash,
    runBulkPurgeTrash,
    runBulkRestoreFromTrash,
    runEmptyTrash,
    refresh,
    refreshWithConnectedSync,
    refreshCustomFolders,
    refreshDrafts,
    reLogin,
    sessionExpired,
    removeMessageFromLocalLists,
    replyAllMode,
    defaultReplyIsAll,
    composeDelaySeconds,
    replyBcc,
    replyFiles,
    replyText,
    replyQuoteMode,
    resetCompose,
    router,
    runBulkCustomFolder,
    runBulkFolder,
    runBulkMarkRead,
    runBulkSnooze,
    runBulkStar,
    saveComposeDraft,
    searchActive,
    searchDateFrom,
    searchDateTo,
    searchFiltersOpen,
    searchFrom,
    searchHasAttachment,
    searchInputRef,
    searchParams,
    searchQuery,
    searchResults,
    searchExternalHits,
    openExternalSearchHit,
    composeScheduleAt,
    setComposeScheduleAt,
    selectedId,
    composeSendAsKey,
    setComposeSendAsKey,
    sendCompose,
    sendReadiness,
    sendReply,
    sending,
    sent,
    sentLoading,
    sentPreview,
    setActiveCustomFolderId,
    setActiveSwipeRowId,
    setActiveThreadId,
    setAiMailConsent,
    setAiSuggestBusy,
    setCheckedIds,
    setComposeBcc,
    setComposeCc,
    setComposeError,
    setComposeFiles,
    setComposeHtml,
    setComposeOpen,
    setComposeRich,
    setComposeAiAssistActive,
    setComposeAiDraftBusy,
    setComposeShowCcBcc,
    setComposeSignatures,
    setComposeStoredAttachments,
    setComposeSubject,
    setComposeTemplates,
    setComposeText,
    setComposeTo,
    setCustomFolders,
    setDetail,
    setDetailOffline,
    setDraftPreview,
    setDrafts,
    setEditingDraftId,
    setForwardMessageId,
    setInboxBranding,
    setInboxListDensity,
    setInboxOffline,
    setInboxOfflineCachedAt,
    setMessages,
    setMobilePane,
    setPendingUndo,
    setReplyAllMode,
    setReplyBcc,
    setReplyFiles,
    setReplyText,
    setSearchDateFrom,
    setSearchDateTo,
    setSearchFiltersOpen,
    setSearchFrom,
    setSearchHasAttachment,
    setSearchQuery,
    setSearchResults,
    setSelectedId,
    setSendReadiness,
    setSending,
    setSent,
    setSentLoading,
    setSentPreview,
    setSettingsOpen,
    setShortcutsOpen,
    setSummary,
    setThreadMessages,
    setThreadView,
    setThreads,
    setToast,
    setUndoSecondsLeft,
    setView,
    settingsOpen,
    settingsInitialView,
    setSettingsInitialView,
    mailBulkAssistActive,
    setMailBulkAssistActive,
    mailSwipeAssistActive,
    setMailSwipeAssistActive,
    mailDmarcAssistActive,
    setMailDmarcAssistActive,
    mailPwaAssistActive,
    setMailPwaAssistActive,
    mailEngagementAssistActive,
    setMailEngagementAssistActive,
    mailOpsAssistActive,
    setMailOpsAssistActive,
    shortcutsOpen,
    snoozeSelected,
    startForwardFromDetail,
    storageAtLimit,
    summary,
    swipeArchiveLabel,
    swipePrimaryAction,
    swipePrimaryActionLabel,
    swipeRowArchive,
    swipeRowDelete,
    swipeRowToggleRead,
    switchView,
    threadMessages,
    threadView,
    threads,
    toast,
    toggleChecked,
    toggleCurrentStarred,
    toggleMessageStarred,
    toggleSelectAll,
    undoSecondsLeft,
    view,
  } = mail;

  const capInboxEmpty = useMemo(() => {
    if (
      view !== "inbox" ||
      searchActive ||
      inboxConnectedSource === "all" ||
      listItems.length > 0
    ) {
      return null;
    }
    const accounts = connectedAccounts.filter(
      (account) =>
        account.provider === inboxConnectedSource && account.enabled,
    );
    return {
      source: inboxConnectedSource,
      reason:
        accounts.length === 0
          ? ("no_account" as const)
          : ("sync_pending" as const),
    };
  }, [
    view,
    searchActive,
    inboxConnectedSource,
    listItems.length,
    connectedAccounts,
  ]);

  const inboxListScrollRef = useRef<HTMLDivElement>(null);
  const selectedInboxListRow = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? null,
    [messages, selectedId],
  );

  const userCategoryById = useMemo(
    () => new Map(userInboxCategories.map((c) => [c.id, c])),
    [userInboxCategories],
  );

  const inboxToolbarScrollKey = useMemo(
    () =>
      `${inboxFocusLane}|${inboxConnectedSource}|${Array.from(inboxQueryFilters).sort().join(",")}`,
    [inboxFocusLane, inboxConnectedSource, inboxQueryFilters],
  );

  useEffect(() => {
    if (view !== "inbox" || !showInboxLaneAndFilters) {
      return;
    }
    const el = inboxListScrollRef.current;
    if (el) {
      el.scrollTop = 0;
    }
  }, [view, showInboxLaneAndFilters, inboxToolbarScrollKey]);

  return (
    <div
      className={`mail-app mobile-pane-${mobilePane}${embedMode ? " mail-app--embed" : ""}${embedHubShell ? " mail-app--embed-hub" : ""}${shellBrand === "ekolojik" ? " mail-app--shell-ekolojik" : ""}${inboxListDensity === "compact" ? " mail-app--list-compact" : ""}`}
    >
      {sessionExpired ? (
        <div className="mail-session-expired-banner" role="alert">
          <span>{t("sessionExpired")}</span>
          <button type="button" onClick={() => reLogin()}>
            {t("sessionReLogin")}
          </button>
        </div>
      ) : null}
      {(inboxOffline || detailOffline) ? (
        <div className="mail-offline-banner" role="status">
          {t("offlineBanner")}
          {inboxOfflineCachedAt
            ? ` · ${new Date(inboxOfflineCachedAt).toLocaleString("tr-TR")}`
            : ""}
        </div>
      ) : null}
      {accessToken ? (
        <MailPilotBillingNotice accessToken={accessToken} variant="banner" />
      ) : null}
      {accessToken ? <MailIosPwaOnboardingBanner /> : null}
      <div className="mail-mobile-bar">
        <button type="button" onClick={() => setMobilePane("nav")}>
          {t("mobileMenu")}
        </button>
        <button type="button" onClick={() => setMobilePane("list")}>
          {t("mobileList")}
        </button>
        {selectedId ? (
          <button type="button" onClick={() => setMobilePane("read")}>
            {t("mobileMessage")}
          </button>
        ) : null}
      </div>
      <aside className="mail-sidebar">
        <div className="mail-brand">
          {inboxBranding?.allowed && inboxBranding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={inboxBranding.logoUrl}
              alt=""
              className="mail-brand-logo"
            />
          ) : null}
          {embedMode &&
          (inboxBranding?.hidePlatformEmailChrome ||
            inboxBranding?.emailBrandTitle) ? (
            <span className="mail-brand-title-only mail-brand-title-only--embed">
              {inboxBranding?.emailBrandTitle?.trim() ||
                summary?.primaryAddress ||
                t("corporateMail")}
            </span>
          ) : inboxBranding?.allowed && inboxBranding.emailBrandTitle ? (
            <span className="mail-brand-title-only">
              {inboxBranding.emailBrandTitle}
            </span>
          ) : (
            <>
              <strong>Lerta</strong> {t("brandPosta")}
            </>
          )}
        </div>
        <button
          type="button"
          className="mail-compose-btn"
          disabled={storageAtLimit}
          title={
            storageAtLimit
              ? t("storageQuotaTitle")
              : undefined
          }
          onClick={() => {
            resetCompose();
            setComposeOpen(true);
          }}
        >
          {t("composeBtn")}
        </button>
        <div className="mail-nav-scroll">
        <nav className="mail-nav">
          <button
            type="button"
            className={
              view === "inbox" && !activeCustomFolderId ? "active" : ""
            }
            onClick={() => {
              setActiveCustomFolderId(null);
              switchView("inbox");
            }}
          >
            {t("navInbox")}
            {summary && summary.unreadCount > 0
              ? ` (${summary.unreadCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "sent" ? "active" : ""}
            onClick={() => switchView("sent")}
          >
            {t("navSent")}
          </button>
          <button
            type="button"
            className={view === "all" ? "active" : ""}
            onClick={() => switchView("all")}
          >
            {t("navAll")}
          </button>
          <button
            type="button"
            className={view === "starred" ? "active" : ""}
            onClick={() => switchView("starred")}
          >
            {t("navStarred")}
            {summary && (summary.starredCount ?? 0) > 0
              ? ` (${summary.starredCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "snoozed" ? "active" : ""}
            onClick={() => switchView("snoozed")}
          >
            {t("navSnoozed")}
            {summary && (summary.snoozedCount ?? 0) > 0
              ? ` (${summary.snoozedCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "spam" ? "active" : ""}
            onClick={() => switchView("spam")}
          >
            {t("navSpam")}
            {summary && summary.spamCount > 0 ? ` (${summary.spamCount})` : ""}
          </button>
          <button
            type="button"
            className={view === "archive" ? "active" : ""}
            onClick={() => switchView("archive")}
          >
            {t("navArchive")}
            {summary && (summary.archiveCount ?? 0) > 0
              ? ` (${summary.archiveCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "trash" ? "active" : ""}
            onClick={() => switchView("trash")}
          >
            {t("navTrash")}
            {summary && (summary.trashCount ?? 0) > 0
              ? ` (${summary.trashCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "drafts" ? "active" : ""}
            onClick={() => switchView("drafts")}
          >
            {t("navDrafts")}
            {drafts.length > 0 ? ` (${drafts.length})` : ""}
          </button>
          <button
            type="button"
            className={view === "calendar" ? "active" : ""}
            onClick={() => switchView("calendar")}
          >
            {t("navCalendar")}
          </button>
          <button
            type="button"
            className={view === "contacts" ? "active" : ""}
            onClick={() => switchView("contacts")}
          >
            {t("navContacts")}
          </button>
          {customFolders.length > 0 ? (
            <div className="mail-custom-folders-label">{t("navCustomFolders")}</div>
          ) : null}
          {customFolders.map((f) => (
            <div key={f.id} className="mail-custom-folder-row">
              <button
                type="button"
                className={
                  view === "inbox" && activeCustomFolderId === f.id
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setActiveCustomFolderId(f.id);
                  switchView("inbox");
                  void refresh();
                }}
              >
                {f.name}
                {f.messageCount > 0 ? ` (${f.messageCount})` : ""}
              </button>
              <button
                type="button"
                className="mail-custom-folder-action"
                title={t("folderRenameTitle")}
                onClick={() => {
                  const next = window.prompt(t("folderRenamePrompt"), f.name);
                  if (!next?.trim() || !accessToken || next.trim() === f.name) {
                    return;
                  }
                  void renameCustomFolder(accessToken, f.id, next.trim()).then(
                    () => {
                      setToast(t("toastFolderUpdated"));
                      void refreshCustomFolders();
                    },
                    (error: unknown) => {
                      setToast(
                        error instanceof Error
                          ? error.message
                          : t("errFolderUpdateFailed"),
                      );
                    },
                  );
                }}
              >
                ✎
              </button>
              <button
                type="button"
                className="mail-custom-folder-action mail-custom-folder-delete"
                title={t("folderDeleteTitle")}
                onClick={() => {
                  if (
                    !accessToken ||
                    !window.confirm(
                      t("folderDeleteConfirm", { name: f.name }),
                    )
                  ) {
                    return;
                  }
                  void deleteCustomFolder(accessToken, f.id).then(
                    () => {
                      if (activeCustomFolderId === f.id) {
                        setActiveCustomFolderId(null);
                      }
                      setToast(t("toastFolderDeleted"));
                      void refreshCustomFolders();
                      void refresh();
                    },
                    (error: unknown) => {
                      setToast(
                        error instanceof Error
                          ? error.message
                          : t("errFolderDeleteFailed"),
                      );
                    },
                  );
                }}
              >
                ×
              </button>
            </div>
          ))}
        </nav>
        </div>
        <div className="mail-sidebar-footer">
        {sendReadiness && !sendReadiness.canSend && sendReadiness.reasonTr ? (
          <p className="mail-storage-warn mail-storage-warn--danger">
            {sendReadiness.reasonTr}
          </p>
        ) : null}
        {sendReadiness?.billingWarningTr ? (
          <p className="mail-storage-warn">{sendReadiness.billingWarningTr}</p>
        ) : null}
        <div className="mail-sidebar-icon-actions">
          <button
            type="button"
            className="mail-nav-imap mail-nav-imap--icon"
            onClick={() => void promptCreateCustomFolder()}
            aria-label={t("folderNewAria")}
            title={t("folderNewAria")}
          >
            <svg
              className="mail-nav-imap-icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M20 6h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-2 10h-2v2h-2v-2h-2v-2h2v-2h2v2h2v2Z"
              />
            </svg>
          </button>
          <button
            type="button"
            className="mail-nav-imap mail-nav-imap--icon"
            onClick={() => setSettingsOpen(true)}
            aria-label={t("settingsAriaLong")}
            title={t("settingsImapAria")}
          >
            <svg
              className="mail-nav-imap-icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.36 2.54a7.03 7.03 0 0 0-1.63.94l-2.39-.96a.49.49 0 0 0-.59.22L2.71 8.04a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.13.22.39.3.59.22l2.39-.96c.5.38 1.04.69 1.63.94l.36 2.54c.05.24.26.42.49.42h4c.24 0 .44-.18.49-.42l.36-2.54c.59-.25 1.13-.56 1.63-.94l2.39.96c.2.08.46 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
              />
            </svg>
          </button>
        </div>
        {summary?.storageQuota ? (
          <div className="mail-storage-quota">
            <div className="mail-storage-label">
              Depolama{" "}
              {(summary.storageQuota.usedBytes / (1024 ** 3)).toFixed(1)} /{" "}
              {summary.storageQuota.limitLabelGb} GB
            </div>
            <div className="mail-storage-bar">
              <div
                className={
                  summary.storageQuota.atLimit
                    ? "fill danger"
                    : summary.storageQuota.nearLimit
                      ? "fill warn"
                      : "fill"
                }
                style={{
                  width: `${summary.storageQuota.utilizationPercent}%`,
                }}
              />
            </div>
            {summary.storageQuota.atLimit ? (
              <p className="mail-storage-warn mail-storage-warn--danger">
                {t("storageQuotaAtLimitWarn")} {t("storageQuotaHint")}
              </p>
            ) : summary.storageQuota.nearLimit ? (
              <p className="mail-storage-warn">
                {t("storageQuotaNearLimitWarn")}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mail-address">
          {summary?.primaryAddress ?? "—"}
          <br />
          <button
            type="button"
            style={{
              marginTop: 8,
              border: "none",
              background: "none",
              color: "var(--accent)",
              cursor: "pointer",
              padding: 0,
            }}
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            {t("logout")}
          </button>
          {process.env.NEXT_PUBLIC_DEPLOY_SHA ? (
            <span
              className="mail-deploy-sha"
              title={process.env.NEXT_PUBLIC_DEPLOY_TIME}
            >
              {t("version")} {process.env.NEXT_PUBLIC_DEPLOY_SHA}
            </span>
          ) : null}
        </div>
        </div>
      </aside>

      {view === "calendar" || view === "contacts" ? (
        <section className="mail-d6-pane">
          {view === "calendar" ? (
            <MailCalendarPanel
              accessToken={accessToken!}
              onToast={setToast}
            />
          ) : (
            <MailContactsPanel
              accessToken={accessToken!}
              onToast={setToast}
              onComposeTo={(addr) => {
                resetCompose();
                setComposeTo(addr);
                setComposeOpen(true);
              }}
            />
          )}
        </section>
      ) : (
        <>
      <section
        className={`mail-list${view === "inbox" ? " mail-list-inbox-premium" : ""}`}
      >
        {view !== "drafts" ? (
          <div
            className={`mail-search${view === "inbox" ? " mail-inbox-search-premium" : ""}`}
          >
            {showInboxLaneAndFilters ? (
              <MailInboxCommandBar
                t={t}
                title={t("inboxTitle")}
                meta={
                  summary && summary.unreadCount > 0
                    ? t("inboxUnreadCount", { count: summary.unreadCount })
                    : t("inboxAllRead")
                }
                inboxFocusLane={inboxFocusLane}
                onFocusLaneChange={setInboxFocusLane}
                activeFilters={inboxQueryFilters}
                onToggleFilter={toggleInboxQueryFilter}
                onClearFilters={clearInboxQueryFilters}
                userCategories={userInboxCategories}
                activeUserCategoryIds={inboxUserCategoryFilterIds}
                onToggleUserCategory={toggleInboxUserCategoryFilter}
                onClearUserCategoryFilters={clearInboxUserCategoryFilters}
                showConnectedInboxTabs={showConnectedInboxTabs}
                inboxConnectedSource={inboxConnectedSource}
                onConnectedSourceChange={setInboxConnectedSource}
                showFocusTabs={focusedInboxEnabled}
              />
            ) : null}
            {mailBulkAssistActive ? (
              <p className="mail-parity-assist-banner" role="status">
                {t("bulkAssistBanner")}{" "}
                <button
                  type="button"
                  className="mail-parity-assist-dismiss"
                  onClick={() => setMailBulkAssistActive(false)}
                >
                  {t("actionClose")}
                </button>
              </p>
            ) : null}
            {mailSwipeAssistActive ? (
              <p className="mail-parity-assist-banner mail-parity-assist-banner--swipe" role="status">
                {t("swipeAssistBanner", { action: swipePrimaryActionLabel })}{" "}
                <button
                  type="button"
                  className="mail-parity-assist-dismiss"
                  onClick={() => setMailSwipeAssistActive(false)}
                >
                  {t("actionClose")}
                </button>
              </p>
            ) : null}
            <div className="mail-list-toolbar mail-list-toolbar-main">
              {canUseThreads && !searchActive ? (
                <label className="mail-thread-toggle">
                  <input
                    type="checkbox"
                    checked={threadView}
                    onChange={(e) => setThreadView(e.target.checked)}
                  />
                  {t("threadToggle")}
                </label>
              ) : null}
              {canBulkSelect && listItems.length > 0 ? (
                <label className="mail-bulk-check">
                  <input
                    type="checkbox"
                    checked={allListSelected}
                    onChange={toggleSelectAll}
                    aria-label={t("bulkSelectAll")}
                  />
                </label>
              ) : null}
              {canBulkSelect && checkedIds.size > 0 ? (
                <span className="mail-bulk-actions">
                  {view === "trash" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void runBulkRestoreFromTrash()}
                      >
                        {t("readRestore")}
                      </button>
                      <button
                        type="button"
                        className="mail-bulk-danger"
                        onClick={() => void runBulkPurgeTrash()}
                      >
                        {t("readPurge")}
                      </button>
                    </>
                  ) : (
                    <>
                  <button type="button" onClick={() => void runBulkMarkRead(false)}>
                    {t("bulkMarkRead")}
                  </button>
                  <button type="button" onClick={() => void runBulkMarkRead(true)}>
                    {t("bulkMarkUnread")}
                  </button>
                  <button type="button" onClick={() => void runBulkFolder("archive")}>
                    {t("bulkArchiveShort")}
                  </button>
                  <button type="button" onClick={() => void runBulkFolder("trash")}>
                    {t("bulkTrash")}
                  </button>
                    </>
                  )}
                  {view !== "trash" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void runBulkStar(true)}
                      >
                        {t("bulkStar")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void runBulkStar(false)}
                      >
                        {t("bulkUnstar")}
                      </button>
                      <select
                        className="mail-bulk-folder-select"
                        defaultValue=""
                        aria-label={t("bulkSnoozeSelectedAria")}
                        onChange={(e) => {
                          const v = e.target.value;
                          e.target.value = "";
                          if (!v) {
                            return;
                          }
                          void runBulkSnooze(Number(v));
                        }}
                      >
                        <option value="">{t("snoozePrompt")}</option>
                        <option value="1">{t("snooze1h")}</option>
                        <option value="3">{t("snooze3h")}</option>
                        <option value="24">{t("snooze24h")}</option>
                        <option value="168">{t("snooze1w")}</option>
                      </select>
                    </>
                  ) : null}
                  {view === "inbox" || activeCustomFolderId ? (
                    <select
                      className="mail-bulk-folder-select"
                      defaultValue=""
                      aria-label={t("bulkMoveCustomAria")}
                      onChange={(e) => {
                        const v = e.target.value;
                        e.target.value = "";
                        if (!v) {
                          return;
                        }
                        void runBulkCustomFolder(
                          v === "__inbox__" ? null : v,
                        );
                      }}
                    >
                      <option value="">{t("bulkMoveFolderPrompt")}</option>
                      <option value="__inbox__">{t("folderInboxOption")}</option>
                      {customFolders.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  ) : null}
                </span>
              ) : null}
              {view === "trash" && listItems.length > 0 ? (
                <button
                  type="button"
                  className="mail-empty-trash-btn"
                  onClick={() => void runEmptyTrash()}
                >
                  {t("emptyTrashButton")}
                </button>
              ) : null}
              <button
                type="button"
                className="mail-toolbar-btn"
                onClick={() => void refreshWithConnectedSync()}
              >
                {t("refresh")}
              </button>
              <button
                type="button"
                className="mail-toolbar-btn"
                onClick={() => setShortcutsOpen(true)}
                title={t("keyboardShortcutsTitle")}
              >
                ?
              </button>
            </div>
            <div className="mail-inbox-search-field">
              <span className="mail-inbox-search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                ref={searchInputRef}
                type="search"
                placeholder={
                  isPrimaryInbox
                    ? t("searchInboxPlaceholder")
                    : t("searchFolderPlaceholder")
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={t("searchAria")}
              />
            </div>
            <button
              type="button"
              className="mail-search-filters-toggle"
              onClick={() => setSearchFiltersOpen((open) => !open)}
            >
              {searchFiltersOpen ? t("hideFilters") : t("advancedFilter")}
            </button>
            {searchFiltersOpen ? (
              <div className="mail-search-filters">
                <label>
                  {t("filterFrom")}
                  <input
                    type="text"
                    placeholder="ornek@firma.com"
                    value={searchFrom}
                    onChange={(e) => setSearchFrom(e.target.value)}
                  />
                </label>
                <label>
                  {t("filterDateStart")}
                  <input
                    type="date"
                    value={searchDateFrom}
                    onChange={(e) => setSearchDateFrom(e.target.value)}
                  />
                </label>
                <label>
                  {t("filterDateEnd")}
                  <input
                    type="date"
                    value={searchDateTo}
                    onChange={(e) => setSearchDateTo(e.target.value)}
                  />
                </label>
                <label>
                  {t("filterAttachment")}
                  <select
                    value={searchHasAttachment}
                    onChange={(e) =>
                      setSearchHasAttachment(
                        e.target.value as "any" | "yes" | "no",
                      )
                    }
                  >
                    <option value="any">{t("filterAttachmentAny")}</option>
                    <option value="yes">{t("filterAttachmentYes")}</option>
                    <option value="no">{t("filterAttachmentNo")}</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="mail-search-clear"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchFrom("");
                    setSearchDateFrom("");
                    setSearchDateTo("");
                    setSearchHasAttachment("any");
                  }}
                >
                  {t("clearFilters")}
                </button>
              </div>
            ) : null}
            {searchActive && searchResults !== null ? (
              <p className="mail-search-hint">
                {t("searchResultsCount", { count: searchResults.length })}
                {searchExternalHits.length > 0
                  ? t("searchCloudSuffix", { count: searchExternalHits.length })
                  : ""}
              </p>
            ) : null}
            {searchActive && searchExternalHits.length > 0 ? (
              <ul className="mail-search-external-hits">
                {searchExternalHits.map((hit) => (
                  <li key={`${hit.provider}:${hit.providerMessageId}`}>
                    <button
                      type="button"
                      className="mail-list-item"
                      onClick={() => void openExternalSearchHit(hit)}
                    >
                      <span
                        className={inboxSourceBadgeClass(hit.provider)}
                      >
                        {inboxSourceBadgeLabel(hit.provider, hit.provider, t)}
                      </span>
                      <strong>{hit.subject}</strong>
                      <span className="mail-accounts-muted">
                        {hit.fromAddress} · {hit.accountEmail}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <div
          className={view === "inbox" ? "mail-inbox-list-body" : undefined}
          ref={view === "inbox" ? inboxListScrollRef : undefined}
          style={view === "inbox" ? undefined : { display: "contents" }}
        >
        {view === "spam" ? (
          <p className="mail-search-hint" role="status">
            {t("spamFolderHint")}
            {showConnectedInboxTabs ? (
              <>
                {" "}
                {t("capConnectedSpamHint")}
              </>
            ) : null}
          </p>
        ) : null}
        {listItems.length === 0 ? (
          capInboxEmpty ? (
            <MailCapInboxEmptyState
              premium={isPrimaryInbox}
              source={capInboxEmpty.source}
              reason={capInboxEmpty.reason}
              onManageAccounts={() => {
                setSettingsInitialView("accounts");
                setSettingsOpen(true);
              }}
            />
          ) : (
          <MailEmptyState
            premium={isPrimaryInbox}
            variant={
              searchActive
                ? "search"
                : view === "sent"
                  ? "sent"
                  : view === "drafts"
                    ? "drafts"
                    : view === "starred"
                      ? "starred"
                      : view === "trash"
                        ? "trash"
                        : view === "archive"
                          ? "archive"
                          : view === "spam"
                            ? "spam"
                            : "inbox"
            }
          />
          )
        ) : (
          listItems.map((m) => {
            const unread =
              !m.readAt &&
              (view === "inbox" ||
                view === "all" ||
                view === "spam" ||
                view === "archive" ||
                view === "starred");

            if (isPrimaryInbox) {
              const openRow = () => {
                if (threadView && canUseThreads && "threadId" in m) {
                  void openThread(
                    (m as { threadId: string }).threadId,
                    m.id,
                  );
                  return;
                }
                void openMessage(m.id);
              };
              const relatedInbound =
                "relatedInboundMessageId" in m &&
                typeof m.relatedInboundMessageId === "string"
                  ? m.relatedInboundMessageId
                  : null;
              return (
                <MailListSwipeRow
                  key={m.id}
                  rowKey={m.id}
                  activeSwipeKey={activeSwipeRowId}
                  onActiveSwipeKeyChange={setActiveSwipeRowId}
                  primaryAction={swipePrimaryAction}
                  archiveLabel={swipeArchiveLabel}
                  readLabel={
                    unread ? t("bulkMarkRead") : t("bulkMarkUnread")
                  }
                  onArchive={() =>
                    void swipeRowArchive(m.id, relatedInbound)
                  }
                  onDelete={() => void swipeRowDelete(m.id)}
                  onToggleRead={() =>
                    void swipeRowToggleRead(m.id, unread)
                  }
                >
                  <MailInboxMessageRow
                    message={{
                      ...m,
                      starredAt:
                        "starredAt" in m ? m.starredAt ?? null : null,
                      userCategory: m.userInboxCategoryId
                        ? userCategoryById.get(m.userInboxCategoryId) ?? null
                        : null,
                    }}
                    selected={selectedId === m.id}
                    unread={unread}
                    showStar={
                      !threadView || !canUseThreads || searchActive
                    }
                    showCheckbox={canBulkSelect}
                    checked={checkedIds.has(m.id)}
                    onOpen={openRow}
                    onToggleStar={() => {
                      const starred =
                        "starredAt" in m && Boolean(m.starredAt);
                      void toggleMessageStarred(m.id, !starred);
                    }}
                    onToggleCheck={(shiftKey) =>
                      toggleChecked(m.id, shiftKey)
                    }
                  />
                </MailListSwipeRow>
              );
            }

            const relatedInbound =
              "relatedInboundMessageId" in m &&
              typeof m.relatedInboundMessageId === "string"
                ? m.relatedInboundMessageId
                : null;
            const rowMessageKind: "inbound" | "sent" =
              "messageKind" in m && m.messageKind === "sent"
                ? "sent"
                : view === "sent"
                  ? "sent"
                  : "inbound";
            return (
            <MailListSwipeRow
              key={m.id}
              rowKey={m.id}
              activeSwipeKey={activeSwipeRowId}
              onActiveSwipeKeyChange={setActiveSwipeRowId}
              primaryAction={swipePrimaryAction}
              showArchive={view === "trash" ? true : view !== "sent"}
              archiveLabel={swipeArchiveLabel}
              readLabel={
                unread ? t("bulkMarkRead") : t("bulkMarkUnread")
              }
              onArchive={() =>
                void swipeRowArchive(m.id, relatedInbound, rowMessageKind)
              }
              onDelete={() => void swipeRowDelete(m.id, rowMessageKind)}
              onToggleRead={() => {
                if (rowMessageKind === "sent") {
                  return;
                }
                void swipeRowToggleRead(m.id, unread);
              }}
            >
            <div
              role="button"
              tabIndex={0}
              className={`mail-list-item ${selectedId === m.id ? "selected" : ""} ${unread ? "unread" : "read"}`}
              onClick={() => {
                if (view === "drafts") {
                  const d = drafts.find((x) => x.id === m.id);
                  if (d?.source === "connected" && d.inboundMessageId) {
                    void openMessage(d.inboundMessageId);
                    return;
                  }
                  if (d) {
                    setSelectedId(m.id);
                    setDraftPreview(d);
                    setDetail(null);
                    setSentPreview(null);
                  }
                  return;
                }
                if (view === "sent" || (view === "trash" && rowMessageKind === "sent")) {
                  void openSentById(m.id);
                  return;
                }
                if (threadView && canUseThreads && "threadId" in m) {
                  void openThread(
                    (m as { threadId: string }).threadId,
                    m.id,
                  );
                  return;
                }
                void openMessage(m.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && view !== "sent") {
                  if (threadView && canUseThreads && "threadId" in m) {
                    void openThread(
                      (m as { threadId: string }).threadId,
                      m.id,
                    );
                    return;
                  }
                  void openMessage(m.id);
                }
              }}
            >
              {canBulkSelect ? (
                <input
                  type="checkbox"
                  className="mail-list-check"
                  checked={checkedIds.has(m.id)}
                  aria-label={t("rowSelectAria")}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChecked(m.id, e.shiftKey);
                  }}
                  onChange={() => {}}
                />
              ) : null}
              {view !== "sent" &&
              view !== "drafts" &&
              (!threadView || !canUseThreads || searchActive) ? (
                <button
                  type="button"
                  className={`mail-star-btn ${
                    "starredAt" in m && m.starredAt ? "starred" : ""
                  }`}
                  aria-label={
                    "starredAt" in m && m.starredAt
                      ? t("starRemoveAria")
                      : t("starAddAria")
                  }
                  title={
                    "starredAt" in m && m.starredAt
                      ? t("starRemoveAria")
                      : t("starAddAria")
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    const starred = "starredAt" in m && Boolean(m.starredAt);
                    void toggleMessageStarred(m.id, !starred);
                  }}
                >
                  {"starredAt" in m && m.starredAt ? "★" : "☆"}
                </button>
              ) : null}
              {unread ? (
                <span className="mail-list-unread-dot" aria-hidden="true" />
              ) : null}
              <div className="mail-list-item-body">
                <div className="mail-list-meta-row">
                  <div className="mail-list-from">
                    {m.fromAddress}
                    {(m.attachmentCount ?? 0) > 0 ? " 📎" : ""}
                  </div>
                  <time
                    className="mail-list-date"
                    dateTime={m.receivedAt}
                    title={new Date(m.receivedAt).toLocaleString("tr-TR")}
                  >
                    {formatMailListDate(m.receivedAt)}
                  </time>
                </div>
                <div className="mail-list-subject">{m.subject}</div>
                <div className="mail-list-snippet">{m.snippet}</div>
              </div>
            </div>
            </MailListSwipeRow>
            );
          })
        )}
        </div>
      </section>

      <section className="mail-read mail-read--premium">
        {pendingUndo ? (
          <div className="mail-undo-bar">
            <span>
              {t("undoSendingProgress")}
              {undoSecondsLeft > 0 ? ` ${undoSecondsLeft}s` : ""}
            </span>
            <button type="button" onClick={() => void cancelPendingUndo()}>
              {t("readRestore")}
            </button>
          </div>
        ) : null}
        {sendReadiness?.billingWarningTr ? (
          <p className="mail-read-toast mail-read-toast--warn">
            {sendReadiness.billingWarningTr}
          </p>
        ) : null}
        {sendReadiness && !sendReadiness.canSend && sendReadiness.reasonTr ? (
          <p className="mail-read-toast mail-read-toast--warn">
            {sendReadiness.reasonTr}
          </p>
        ) : null}
        {toast && !pendingUndo ? (
          <p className="mail-read-toast">{toast}</p>
        ) : null}
        {sentLoading ? (
          <p className="mail-empty">{t("readLoading")}</p>
        ) : sentPreview ? (
          <>
            <header className="mail-read-header">
              <h1>{sentPreview.subject}</h1>
              <div className="mail-read-meta">
                Kime: {sentPreview.toAddress} ·{" "}
                {new Date(sentPreview.sentAt).toLocaleString("tr-TR")}
              </div>
            </header>
            <div className="mail-read-body mail-read-body--html">
              {sentPreview.bodyHtml ? (
                <iframe
                  key={`sent-${readFontScale}`}
                  title={t("sentPreviewTitle")}
                  className="mail-html-frame mail-html-frame--sent"
                  sandbox=""
                  srcDoc={
                    getMessageHtmlForRead(sentPreview.bodyHtml) ??
                    sentPreview.bodyHtml
                  }
                />
              ) : (
                <pre>{sentPreview.bodyText ?? t("noBodyContent")}</pre>
              )}
            </div>
            {view === "trash" ? (
              <div
                className="mail-read-toolbar"
                role="toolbar"
                aria-label={t("trashOpsAria")}
              >
                <button
                  type="button"
                  className="mail-read-tool-btn"
                  onClick={() => void restoreCurrentFromTrash()}
                >
                  {t("readRestore")}
                </button>
                <button
                  type="button"
                  className="mail-read-tool-btn mail-read-tool-btn--danger"
                  onClick={() => void purgeCurrentMessage()}
                >
                  {t("readPurge")}
                </button>
              </div>
            ) : null}
          </>
        ) : draftPreview ? (
          <>
            <header className="mail-read-header">
              <h1>{draftPreview.subject || t("noSubject")}</h1>
              <div className="mail-read-meta">
                {t("fieldTo")}: {draftPreview.to ?? "—"} · {t("draftUpdatedLabel")}:{" "}
                {new Date(draftPreview.updatedAt).toLocaleString("tr-TR")}
              </div>
            </header>
            <div className="mail-read-body">
              <pre>{draftPreview.text ?? ""}</pre>
            </div>
            {draftPreview.attachments.length > 0 ? (
              <ul className="mail-attachments">
                {draftPreview.attachments.map((file) => (
                  <li key={file.filename}>{file.filename}</li>
                ))}
              </ul>
            ) : null}
            <div className="mail-reply mail-reply--premium mail-reply-draft-actions">
              <button
                type="button"
                className="compose-btn compose-btn--secondary"
                onClick={() => openComposeFromDraft(draftPreview)}
              >
                {t("draftEdit")}
              </button>
              <button
                type="button"
                className="compose-btn compose-btn--primary"
                onClick={() => {
                  if (!accessToken) {
                    return;
                  }
                  void (async () => {
                    try {
                      const draftResult = await sendDraft(
                        accessToken,
                        draftPreview.id,
                        composeDelaySeconds() !== undefined
                          ? { delaySeconds: composeDelaySeconds() }
                          : {},
                      );
                      if (applyDelayedSend(draftResult)) {
                        setDraftPreview(null);
                        setSelectedId(null);
                        return;
                      }
                      setToast(t("toastSent"));
                      setDraftPreview(null);
                      setSelectedId(null);
                      void refresh();
                      void refreshDrafts();
                      setView("sent");
                    } catch (error) {
                      setToast(
                        error instanceof Error
                          ? error.message
                          : t("toastSendFailed"),
                      );
                    }
                  })();
                }}
              >
                {t("composeSend")}
              </button>
              <button
                type="button"
                className="compose-btn compose-btn--ghost"
                onClick={() => {
                  if (!accessToken) {
                    return;
                  }
                  void (async () => {
                    await deleteDraft(accessToken, draftPreview.id);
                    setDraftPreview(null);
                    setSelectedId(null);
                    void refreshDrafts();
                  })();
                }}
              >
                {t("actionDelete")}
              </button>
            </div>
          </>
        ) : !detail ? (
          <MailEmptyState variant="read" />
        ) : (
          <>
            <header className="mail-read-header mail-read-header--premium">
              <button
                type="button"
                className="mail-back-read compose-chip-btn"
                onClick={() => {
                  setMobilePane("list");
                  setDetail(null);
                  setSelectedId(null);
                  setActiveThreadId(null);
                  setThreadMessages([]);
                }}
              >
                ← Liste
              </button>
              {activeThreadId && threadMessages.length > 1 ? (
                <div className="mail-thread-stack" role="list">
                  {threadMessages.map((tm) => (
                    <button
                      key={tm.id}
                      type="button"
                      role="listitem"
                      className={
                        selectedId === tm.id ? "active" : undefined
                      }
                      onClick={() => void openMessage(tm.id)}
                    >
                      <span className="mail-thread-stack-from">
                        {tm.fromAddress}
                      </span>
                      <span className="mail-thread-stack-date">
                        {new Date(tm.receivedAt).toLocaleString("tr-TR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              <h1 className="mail-read-title">{detail.subject}</h1>
              <div className="mail-read-meta mail-read-meta--premium">
                {t("readFromLabel")}: {detail.fromAddress} ·{" "}
                {new Date(detail.receivedAt).toLocaleString("tr-TR")}
                {detail.spamReason ? ` · ${detail.spamReason}` : ""}
                {detail.snoozedUntil &&
                new Date(detail.snoozedUntil).getTime() > Date.now()
                  ? t("snoozedUntilSuffix", {
                      date: new Date(detail.snoozedUntil).toLocaleString(
                        "tr-TR",
                      ),
                    })
                  : null}
              </div>
            </header>
            {detail.attachments.length > 0 ? (
              <ul className="mail-attachments">
                {detail.attachments.map((file) => (
                  <li key={file.index}>
                    <button
                      type="button"
                      onClick={() =>
                        void downloadAttachment(file.index, file.filename)
                      }
                    >
                      {file.filename} ({Math.round(file.sizeBytes / 1024)} KB)
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mail-read-body">
              {detail.bodyHtml ? (
                <>
                  {shouldPromptRemoteImages(detail.bodyHtml) ? (
                    <div className="mail-remote-images-banner" role="status">
                      <span>{t("remoteImagesHidden")}</span>
                      <button
                        type="button"
                        onClick={() => setRemoteImagesRevealed(true)}
                      >
                        {t("remoteImagesShowBtn")}
                      </button>
                    </div>
                  ) : null}
                  <iframe
                    key={`${detail.id}-${readFontScale}`}
                    title={t("messageContentTitle")}
                    className="mail-html-frame"
                    sandbox=""
                    srcDoc={
                      getMessageHtmlForRead(detail.bodyHtml) ?? detail.bodyHtml
                    }
                  />
                </>
              ) : (
                <pre>{detail.bodyText ?? ""}</pre>
              )}
            </div>
            <div
              className="mail-read-toolbar"
              role="toolbar"
              aria-label={t("messageOpsAria")}
            >
              {detail.mailboxFolder !== "trash" ? (
                <button
                  type="button"
                  className={`mail-read-tool-btn ${detail.starredAt ? "is-active" : ""}`}
                  onClick={() => void toggleCurrentStarred()}
                >
                  {detail.starredAt ? t("readStarred") : t("readStar")}
                </button>
              ) : null}
              {view === "trash" || detail.mailboxFolder === "trash" ? (
                <>
                  <button
                    type="button"
                    className="mail-read-tool-btn"
                    onClick={() => void restoreCurrentFromTrash()}
                  >
                    {t("readRestore")}
                  </button>
                  <button
                    type="button"
                    className="mail-read-tool-btn mail-read-tool-btn--danger"
                    onClick={() => void purgeCurrentMessage()}
                  >
                    {t("readPurge")}
                  </button>
                </>
              ) : (
                <>
                  {view !== "archive" && detail.mailboxFolder !== "archive" ? (
                    <button
                      type="button"
                      className="mail-read-tool-btn"
                      onClick={() => void moveCurrentMessage("archive")}
                    >
                      {t("readArchive")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mail-read-tool-btn"
                      onClick={() => void moveCurrentMessage("inbox")}
                    >
                      {t("readMoveToInbox")}
                    </button>
                  )}
                  <button
                    type="button"
                    className="mail-read-tool-btn"
                    onClick={() => void moveCurrentMessage("trash")}
                  >
                    {t("actionDelete")}
                  </button>
                  {detail.readAt ? (
                    <button
                      type="button"
                      className="mail-read-tool-btn"
                      onClick={() => void markCurrentUnread()}
                    >
                      {t("readMarkUnread")}
                    </button>
                  ) : null}
                </>
              )}
            </div>
            {view !== "sent" && view !== "trash" ? (
              <div className="mail-reply mail-reply--premium">
                <div className="mail-reply-premium-head">
                  <h3 className="mail-reply-premium-title">{t("replySectionTitle")}</h3>
                  {replyAllMode ? (
                    <span className="mail-reply-all-badge">{t("replyAllBadge")}</span>
                  ) : null}
                </div>
                <div className="compose-field mail-reply-field">
                  <label className="compose-field-label" htmlFor="reply-bcc">
                    Bcc
                  </label>
                  <input
                    id="reply-bcc"
                    type="text"
                    placeholder={t("replyBccPlaceholder")}
                    value={replyBcc}
                    onChange={(e) => setReplyBcc(e.target.value)}
                    className="compose-input"
                  />
                </div>
                <textarea
                  className="compose-textarea mail-reply-textarea"
                  placeholder={t("replyPlaceholder")}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                />
                {detail ? (
                  <MailReplyQuotePreview
                    source={{
                      fromAddress: detail.fromAddress,
                      receivedAt: detail.receivedAt,
                      bodyText: detail.bodyText,
                      bodyHtml: detail.bodyHtml,
                      snippet: detail.snippet,
                    }}
                    mode={replyQuoteMode}
                    draftText={replyText}
                  />
                ) : null}
                <MailComposeMergeFields
                  open={composeMergeOpen}
                  onToggleOpen={() => setComposeMergeOpen((open) => !open)}
                  musteriAdi={composeMergeMusteriAdi}
                  referans={composeMergeReferans}
                  onMusteriAdiChange={setComposeMergeMusteriAdi}
                  onReferansChange={setComposeMergeReferans}
                  onInsertToken={insertReplyMergeToken}
                  idPrefix="reply"
                />
                <div className="compose-attach-zone mail-reply-attach">
                  <label className="compose-attach-label">
                    <span className="compose-attach-title">{t("attachLabel")}</span>
                    <span className="compose-attach-btn">{t("attachChoose")}</span>
                    <input
                      type="file"
                      multiple
                      className="compose-attach-input"
                      onChange={(e) =>
                        setReplyFiles(Array.from(e.target.files ?? []))
                      }
                    />
                  </label>
                  {replyFiles.length > 0 ? (
                    <p className="mail-attach-hint">
                      {t("replyAttachmentsCount", {
                        count: replyFiles.length,
                        maxCount: 3,
                        maxMb: maxAttachmentMb,
                      })}
                    </p>
                  ) : (
                    <p className="compose-attach-hint">{t("composeNoFileSelected")}</p>
                  )}
                </div>
                {detail.snoozedUntil &&
                new Date(detail.snoozedUntil).getTime() > Date.now() &&
                accessToken &&
                selectedId ? (
                  <button
                    type="button"
                    className="compose-chip-btn mail-reply-unsnooze"
                    onClick={() =>
                      void unsnoozeMailMessage(accessToken, selectedId).then(
                        () => {
                          setToast(t("toastSnoozeCleared"));
                          void refresh();
                          void openMessage(selectedId);
                        },
                      )
                    }
                  >
                    {t("snoozeClear")}
                  </button>
                ) : null}
                {selectedId && selectedInboxListRow ? (
                  <div className="mail-inbox-category-field">
                    <label className="mail-inbox-category-field__label">
                      {t("inboxCategoryLabel")}
                      <select
                        className="mail-inbox-category-field__select"
                        value={selectedInboxListRow.userInboxCategoryId ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          void setMessageUserInboxCategory(
                            selectedId,
                            value === "" ? null : value,
                          ).catch(() => setToast(t("settingsCategoriesSaveFailed")));
                        }}
                      >
                        <option value="">{t("inboxCategoryNone")}</option>
                        {userInboxCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedInboxListRow.userInboxCategoryId &&
                    userCategoryById.get(selectedInboxListRow.userInboxCategoryId) ? (
                      <UserCategoryBadge
                        category={
                          userCategoryById.get(
                            selectedInboxListRow.userInboxCategoryId,
                          )!
                        }
                      />
                    ) : null}
                    <button
                      type="button"
                      className="compose-btn compose-btn--secondary"
                      onClick={() => {
                        setSettingsInitialView("categories");
                        setSettingsOpen(true);
                      }}
                    >
                      {t("inboxManageCategories")}
                    </button>
                  </div>
                ) : null}
                <div className="mail-reply-premium-actions">
                  <div className="mail-reply-action-group">
                    <button
                      type="button"
                      className="compose-btn compose-btn--secondary"
                      disabled={!selectedId || aiSuggestBusy}
                      onClick={() => {
                        if (!selectedId) {
                          return;
                        }
                        setAiSuggestBusy(true);
                        void ensureAiMailConsent()
                          .then((allowed) => {
                            if (!allowed) {
                              return null;
                            }
                            return fetchSuggestReply(accessToken!, selectedId, "tr");
                          })
                          .then((result) => {
                            if (!result) {
                              return;
                            }
                            setReplyText(result.suggestion);
                            setToast(
                              result.provider === "llm"
                                ? t("toastAiReplyAdded")
                                : t("toastReplyTemplateAdded"),
                            );
                          })
                          .catch(() => setToast(t("toastSuggestFailed")))
                          .finally(() => setAiSuggestBusy(false));
                      }}
                    >
                      {aiSuggestBusy ? t("aiReplySuggestBusy") : t("aiReplySuggest")}
                    </button>
                    <button
                      type="button"
                      className="compose-btn compose-btn--secondary"
                      disabled={!selectedId || aiSuggestBusy}
                      onClick={() => {
                        if (!selectedId || !accessToken) {
                          return;
                        }
                        setAiSuggestBusy(true);
                        void ensureAiMailConsent()
                          .then((allowed) =>
                            allowed
                              ? fetchSummarizeMessage(accessToken, selectedId, "tr")
                              : null,
                          )
                          .then((result) => {
                            if (result) {
                              setToast(
                                t("toastAiSummary", {
                                  provider: result.provider,
                                  snippet: result.summary.slice(0, 120),
                                }),
                              );
                            }
                          })
                          .catch(() => setToast(t("toastSummaryFailed")))
                          .finally(() => setAiSuggestBusy(false));
                      }}
                    >
                      {t("aiSummary")}
                    </button>
                    <button
                      type="button"
                      className="compose-btn compose-btn--secondary"
                      disabled={!selectedId || aiSuggestBusy}
                      onClick={() => {
                        if (!selectedId || !accessToken) {
                          return;
                        }
                        setAiSuggestBusy(true);
                        void ensureAiMailConsent()
                          .then((allowed) =>
                            allowed
                              ? fetchClassifyMessage(accessToken, selectedId)
                              : null,
                          )
                          .then((result) => {
                            if (result) {
                              setToast(
                                t("toastAiClassify", {
                                  label: result.label,
                                  provider: result.provider,
                                }),
                              );
                              void refresh();
                            }
                          })
                          .catch(() => setToast(t("aiClassifyFailed")))
                          .finally(() => setAiSuggestBusy(false));
                      }}
                    >
                      {t("aiClassify")}
                    </button>
                    {defaultReplyIsAll ? (
                      <>
                        <button
                          type="button"
                          className="compose-btn compose-btn--primary"
                          onClick={() => void sendReply(true)}
                        >
                          {t("replyAll")}
                        </button>
                        <button
                          type="button"
                          className="compose-btn compose-btn--secondary"
                          onClick={() => void sendReply(false)}
                        >
                          {t("replyAction")}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="compose-btn compose-btn--primary"
                          onClick={() => void sendReply(false)}
                        >
                          {t("replyAction")}
                        </button>
                        <button
                          type="button"
                          className="compose-btn compose-btn--secondary"
                          onClick={() => void sendReply(true)}
                        >
                          {t("replyAll")}
                        </button>
                      </>
                    )}
                  </div>
                  <div className="mail-reply-action-group mail-reply-action-group--end">
                    <select
                      className="compose-select mail-snooze-select"
                      defaultValue=""
                      aria-label={t("snoozeAria")}
                      onChange={(e) => {
                        const hours = Number(e.target.value);
                        if (hours > 0) {
                          void snoozeSelected(hours);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">{t("snoozePrompt")}</option>
                      <option value="1">{t("snooze1h")}</option>
                      <option value="3">{t("snooze3h")}</option>
                      <option value="24">{t("snoozeTomorrow")}</option>
                      <option value="168">{t("snooze1w")}</option>
                    </select>
                    <button
                      type="button"
                      className="compose-btn compose-btn--ghost"
                      onClick={() => startForwardFromDetail()}
                    >
                      {t("forwardAction")}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
        </>
      )}

      {composeOpen ? (
        <div
          className="compose-overlay compose-overlay--premium"
          role="presentation"
          onClick={() => {
            setComposeOpen(false);
            resetCompose();
          }}
        >
          <div
            className="compose-dialog compose-dialog--premium"
            role="dialog"
            aria-labelledby="compose-premium-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="compose-premium-header">
              <div className="compose-premium-header-text">
                <h2 id="compose-premium-title">
                  {forwardMessageId
                    ? t("forwardAction")
                    : editingDraftId
                      ? t("composeEditDraft")
                      : t("composeNew")}
                </h2>
                <p className="compose-premium-subtitle">
                  {summary?.primaryAddress
                    ? t("composeFrom", { address: summary.primaryAddress })
                    : t("composeCorporateSend")}
                </p>
              </div>
              <button
                type="button"
                className="compose-premium-close"
                aria-label={t("actionClose")}
                onClick={() => {
                  setComposeOpen(false);
                  resetCompose();
                }}
              >
                ×
              </button>
            </header>

            <div className="compose-premium-body">
              {composeAiAssistActive ? (
                <p className="mail-parity-assist-banner" role="status">
                  {t("composeAiAssistBanner")}{" "}
                  <button
                    type="button"
                    className="mail-parity-assist-dismiss"
                    onClick={() => setComposeAiAssistActive(false)}
                  >
                    {t("actionClose")}
                  </button>
                </p>
              ) : null}
              {!forwardMessageId && !editingDraftId ? (
                <div className="compose-premium-inline-tools">
                  <button
                    type="button"
                    className={
                      composeCampaignMode
                        ? "compose-chip-btn is-active"
                        : "compose-chip-btn"
                    }
                    onClick={() => setComposeCampaignMode((on) => !on)}
                  >
                    {composeCampaignMode
                      ? t("campaignModeOn")
                      : t("campaignModeOff")}
                  </button>
                  {composeCampaignMode ? (
                    <button
                      type="button"
                      className="compose-chip-btn"
                      onClick={() => setComposeCampaignHistoryOpen((on) => !on)}
                    >
                      {composeCampaignHistoryOpen
                        ? t("campaignHistoryHide")
                        : t("campaignHistoryShow")}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {composeCampaignMode && accessToken ? (
                <MailCampaignHistoryPanel
                  accessToken={accessToken}
                  open={composeCampaignHistoryOpen}
                  onCloneToCompose={applyCampaignClonePayload}
                />
              ) : null}
              {composeCampaignMode && !forwardMessageId && !editingDraftId ? (
                <div className="compose-field">
                  <label
                    className="compose-field-label"
                    htmlFor="compose-campaign-recipients"
                  >
                    {t("composeCampaignRecipientsLabel", {
                      max: maxCampaignRecipients,
                    })}
                  </label>
                  <textarea
                    id="compose-campaign-recipients"
                    className="compose-textarea compose-campaign-recipients"
                    placeholder={t("composeCampaignRecipientsPlaceholder")}
                    value={composeCampaignRecipients}
                    onChange={(e) => setComposeCampaignRecipients(e.target.value)}
                    rows={4}
                  />
                  <p className="compose-attach-hint">
                    {t("composeCampaignRecipientsHint")}
                  </p>
                  <div className="compose-campaign-tools">
                    {composeCampaignTemplates.length > 0 ? (
                      <label className="compose-preset-label">
                        <span>{t("composeCampaignTemplate")}</span>
                        <select
                          className="compose-select"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              applyComposeCampaignTemplate(e.target.value);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">{t("composeSelectPrompt")}</option>
                          {composeCampaignTemplates.map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <label className="compose-attach-label">
                      <span className="compose-attach-btn">{t("composeCsvImport")}</span>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="compose-attach-input"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            void importCampaignCsv(file);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                    <MailCampaignBlockEditor
                      html={composeHtml}
                      onHtmlChange={setComposeHtml}
                    />
                    <label className="compose-field-label" htmlFor="compose-campaign-delay">
                      {t("composeCampaignDelayLabel")}
                    </label>
                    <select
                      id="compose-campaign-delay"
                      className="compose-input"
                      value={composeCampaignDelayMs}
                      onChange={(e) =>
                        setComposeCampaignDelayMs(Number.parseInt(e.target.value, 10) || 0)
                      }
                    >
                      <option value={0}>{t("composeDelayNone")}</option>
                      <option value={250}>250 ms</option>
                      <option value={500}>500 ms</option>
                      <option value={1000}>1 sn</option>
                    </select>
                    <label className="compose-field-label" htmlFor="compose-campaign-schedule">
                      {t("composeCampaignScheduleOptional")}
                    </label>
                    <input
                      id="compose-campaign-schedule"
                      type="datetime-local"
                      className="compose-input"
                      value={composeCampaignScheduleAt}
                      onChange={(e) => setComposeCampaignScheduleAt(e.target.value)}
                    />
                    <label className="compose-field-label" htmlFor="compose-campaign-subject-b">
                      {t("composeCampaignSubjectBLabel")}
                    </label>
                    <input
                      id="compose-campaign-subject-b"
                      type="text"
                      className="compose-input"
                      placeholder={t("composeCampaignSubjectBPlaceholder")}
                      value={composeCampaignSubjectB}
                      onChange={(e) => setComposeCampaignSubjectB(e.target.value)}
                    />
                    <label className="compose-field-label" htmlFor="compose-campaign-html-b">
                      {t("composeCampaignHtmlBLabel")}
                    </label>
                    <textarea
                      id="compose-campaign-html-b"
                      className="compose-textarea"
                      rows={3}
                      placeholder={t("composeCampaignHtmlBPlaceholder")}
                      value={composeCampaignHtmlB}
                      onChange={(e) => setComposeCampaignHtmlB(e.target.value)}
                    />
                    <button
                      type="button"
                      className="compose-chip-btn"
                      onClick={() => setComposeRich(true)}
                    >
                      {t("composeVisualEditorBtn")}
                    </button>
                    <label className="compose-field-label" htmlFor="compose-campaign-domains">
                      {t("composeCampaignDomainLabel")}
                    </label>
                    <input
                      id="compose-campaign-domains"
                      type="text"
                      className="compose-input"
                      placeholder={t("composeCampaignDomainPlaceholder")}
                      value={composeCampaignDomainAllowlist}
                      onChange={(e) => setComposeCampaignDomainAllowlist(e.target.value)}
                    />
                    <label className="compose-field-label" htmlFor="compose-campaign-tags">
                      {t("composeCampaignTagsLabel")}
                    </label>
                    <input
                      id="compose-campaign-tags"
                      type="text"
                      className="compose-input"
                      placeholder={t("composeCampaignTagsPlaceholder")}
                      value={composeCampaignTags}
                      onChange={(e) => setComposeCampaignTags(e.target.value)}
                    />
                    <label className="compose-field-label" htmlFor="compose-campaign-segment-prefix">
                      {t("composeCampaignSegmentPrefixLabel")}
                    </label>
                    <input
                      id="compose-campaign-segment-prefix"
                      type="text"
                      className="compose-input"
                      placeholder="REF-"
                      value={composeCampaignSegmentReferansPrefix}
                      onChange={(e) =>
                        setComposeCampaignSegmentReferansPrefix(e.target.value)
                      }
                    />
                    <label className="compose-field-label" htmlFor="compose-campaign-segment-list">
                      {t("composeCampaignSegmentListLabel")}
                    </label>
                    <textarea
                      id="compose-campaign-segment-list"
                      className="compose-textarea"
                      rows={2}
                      placeholder={t("composeCampaignSegmentListPlaceholder")}
                      value={composeCampaignSegmentReferansList}
                      onChange={(e) =>
                        setComposeCampaignSegmentReferansList(e.target.value)
                      }
                    />
                    <label className="preset-check">
                      <input
                        type="checkbox"
                        checked={composeCampaignRequireMusteriAdi}
                        onChange={(e) =>
                          setComposeCampaignRequireMusteriAdi(e.target.checked)
                        }
                      />
                      {t("composeCampaignRequireName")}
                    </label>
                    <button
                      type="button"
                      className="compose-chip-btn"
                      disabled={composeCampaignSegmentPreviewBusy}
                      onClick={() => void runCampaignSegmentPreview()}
                    >
                      {composeCampaignSegmentPreviewBusy
                        ? t("composeSegmentCalculating")
                        : t("composeSegmentPreviewBtn")}
                    </button>
                    {composeCampaignSegmentPreview ? (
                      <p className="compose-attach-hint">
                        {t("composeSegmentResult", {
                          matched: composeCampaignSegmentPreview.matched,
                          total: composeCampaignSegmentPreview.total,
                          skippedDomain:
                            composeCampaignSegmentPreview.skippedDomain > 0
                              ? t("composeSegmentSkippedDomain", {
                                  count:
                                    composeCampaignSegmentPreview.skippedDomain,
                                })
                              : "",
                          skippedSegment:
                            composeCampaignSegmentPreview.skippedSegment > 0
                              ? t("composeSegmentSkippedSegment", {
                                  count:
                                    composeCampaignSegmentPreview.skippedSegment,
                                })
                              : "",
                          skippedInvalid:
                            composeCampaignSegmentPreview.skippedInvalid > 0
                              ? t("composeSegmentSkippedInvalid", {
                                  count:
                                    composeCampaignSegmentPreview.skippedInvalid,
                                })
                              : "",
                          skippedSuppressed:
                            composeCampaignSegmentPreview.skippedSuppressed > 0
                              ? t("composeSegmentSkippedSuppressed", {
                                  count:
                                    composeCampaignSegmentPreview.skippedSuppressed,
                                })
                              : "",
                        })}
                      </p>
                    ) : null}
                    {composeCampaignScheduleAt ? (
                      <>
                        <label
                          className="compose-field-label"
                          htmlFor="compose-campaign-reminder"
                        >
                          {t("composeCampaignReminderLabel")}
                        </label>
                        <select
                          id="compose-campaign-reminder"
                          className="compose-input"
                          value={composeCampaignReminderMinutes}
                          onChange={(e) =>
                            setComposeCampaignReminderMinutes(
                              Number.parseInt(e.target.value, 10) || 0,
                            )
                          }
                        >
                          <option value={0}>{t("composeDelayNone")}</option>
                          <option value={15}>{t("composeReminder15m")}</option>
                          <option value={30}>{t("composeReminder30m")}</option>
                          <option value={60}>{t("composeReminder1h")}</option>
                        </select>
                        <label className="preset-check">
                          <input
                            type="checkbox"
                            checked={composeCampaignNotifyCreator}
                            onChange={(e) =>
                              setComposeCampaignNotifyCreator(e.target.checked)
                            }
                          />
                          {t("composeCampaignNotifyCreator")}
                        </label>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  {(sendReadiness?.connectedSendAsOptions?.length ?? 0) > 0 ? (
                    <div className="compose-field">
                      <label
                        className="compose-field-label"
                        htmlFor="compose-send-as"
                      >
                        {t("composeFromLabel")}
                      </label>
                      <select
                        id="compose-send-as"
                        className="compose-input"
                        value={composeSendAsKey}
                        onChange={(e) => setComposeSendAsKey(e.target.value)}
                      >
                        <option value="lerta">
                          Lerta · {sendReadiness?.displayAddress ?? t("composeLertaCorporate")}
                        </option>
                        {sendReadiness?.connectedSendAsOptions?.map((opt) => (
                          <option
                            key={`${opt.provider}:${opt.accountId}`}
                            value={`${opt.provider}:${opt.accountId}`}
                          >
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <MailComposeRecipientField
                    id="compose-to"
                    label={t("fieldTo")}
                    placeholder={t("composeRecipientPlaceholder")}
                    value={composeTo}
                    onChange={setComposeTo}
                    contacts={composeOrgContacts}
                    autoFocus
                  />
                </>
              )}

              {!forwardMessageId ? (
                <div className="compose-premium-inline-tools">
                  <button
                    type="button"
                    className="compose-chip-btn"
                    onClick={() => setComposeShowCcBcc((open) => !open)}
                  >
                    {composeShowCcBcc
                      ? t("composeCcBccHide")
                      : t("composeCcBccShow")}
                  </button>
                  <label className="compose-field-label" htmlFor="compose-schedule">
                    {t("composeScheduleLabel")}
                  </label>
                  <input
                    id="compose-schedule"
                    type="datetime-local"
                    className="compose-input"
                    value={composeScheduleAt}
                    onChange={(e) => setComposeScheduleAt(e.target.value)}
                  />
                </div>
              ) : null}

              {!forwardMessageId && composeShowCcBcc ? (
                <>
                  <MailComposeRecipientField
                    id="compose-cc"
                    label={t("fieldCc")}
                    placeholder={t("composeRecipientsComma")}
                    value={composeCc}
                    onChange={setComposeCc}
                    contacts={composeOrgContacts}
                  />
                  <MailComposeRecipientField
                    id="compose-bcc"
                    label={t("fieldBcc")}
                    placeholder={t("composeRecipientsComma")}
                    value={composeBcc}
                    onChange={setComposeBcc}
                    contacts={composeOrgContacts}
                  />
                </>
              ) : null}

              {forwardMessageId ? (
                <p className="mail-compose-forward-hint compose-premium-forward">
                  {t("composeForwardHint", { subject: composeSubject })}
                </p>
              ) : (
                <div className="compose-field">
                  <label className="compose-field-label" htmlFor="compose-subject">
                    {t("fieldSubject")}
                  </label>
                  <input
                    id="compose-subject"
                    className="compose-input"
                    placeholder={t("composeSubjectPlaceholder")}
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                  />
                </div>
              )}

              <div className="compose-preset-row compose-premium-presets">
                {composeAiAssistActive && !forwardMessageId && !editingDraftId ? (
                  <button
                    type="button"
                    className="compose-chip-btn"
                    disabled={composeAiDraftBusy || !accessToken}
                    onClick={() => {
                      if (!accessToken) {
                        return;
                      }
                      setComposeAiDraftBusy(true);
                      void ensureAiMailConsent()
                        .then((allowed) => {
                          if (!allowed) {
                            setToast(t("toastAiPrivacyConsent"));
                            return null;
                          }
                          return fetchSuggestComposeDraft(
                            accessToken,
                            composeSubject,
                            "tr",
                          );
                        })
                        .then((result) => {
                          if (!result) {
                            return;
                          }
                          setComposeText(result.suggestion);
                          setToast(
                            result.provider === "llm"
                              ? t("toastAiBodyAdded")
                              : t("toastTemplateBodyAdded"),
                          );
                        })
                        .catch(() => setToast(t("toastAiDraftFailed")))
                        .finally(() => setComposeAiDraftBusy(false));
                    }}
                  >
                    {composeAiDraftBusy
                      ? t("composeAiDraftBusy")
                      : t("composeAiDraftBtn")}
                  </button>
                ) : null}
                <label className="compose-preset-label">
                  <span>{t("composeTemplateLabel")}</span>
                  <select
                    className="compose-select"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        applyComposeTemplate(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">{t("composeSelectPrompt")}</option>
                    {composeTemplates.some((tpl) => tpl.isSystem) ? (
                      <optgroup label={t("composePresetSystem")}>
                        {composeTemplates
                          .filter((tpl) => tpl.isSystem)
                          .map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                          ))}
                      </optgroup>
                    ) : null}
                    {composeTemplates.some((tpl) => !tpl.isSystem) ? (
                      <optgroup label={t("composePresetCorporate")}>
                        {composeTemplates
                          .filter((tpl) => !tpl.isSystem)
                          .map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                          ))}
                      </optgroup>
                    ) : null}
                  </select>
                </label>
                <label className="compose-preset-label">
                  <span>{t("composeSignatureLabel")}</span>
                  <select
                    className="compose-select"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        applyComposeSignature(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">{t("composeSignatureAdd")}</option>
                    {composeSignatures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.isDefault ? " ★" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <MailComposeMergeFields
                open={composeMergeOpen}
                onToggleOpen={() => setComposeMergeOpen((open) => !open)}
                musteriAdi={composeMergeMusteriAdi}
                referans={composeMergeReferans}
                onMusteriAdiChange={setComposeMergeMusteriAdi}
                onReferansChange={setComposeMergeReferans}
                onInsertToken={insertMergeToken}
              />

              <div className="compose-premium-editor-wrap">
                {!forwardMessageId && !editingDraftId ? (
                  <ComposeRichEditor
                    enabled={composeRich}
                    onEnabledChange={setComposeRich}
                    plainText={composeText}
                    onPlainTextChange={setComposeText}
                    onHtmlChange={setComposeHtml}
                    onInlineImage={addInlineComposeImage}
                    brandAccentColor={inboxBranding?.emailAccentColor}
                    brandLogoUrl={inboxBranding?.logoUrl}
                    brandTitle={inboxBranding?.emailBrandTitle}
                    brandLegalFooter={inboxBranding?.emailLegalFooter}
                  />
                ) : null}
                {!composeRich || forwardMessageId || editingDraftId ? (
                  <textarea
                    className="compose-textarea"
                    placeholder={
                      forwardMessageId
                        ? t("composeTopNotePlaceholder")
                        : t("composeBodyPlaceholder")
                    }
                    rows={8}
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                  />
                ) : null}
              </div>

              <div className="compose-attach-zone">
                <label className="compose-attach-label">
                  <span className="compose-attach-title">{t("composeAttachmentsTitle")}</span>
                  <span className="compose-attach-btn">{t("attachChoose")}</span>
                  <input
                    type="file"
                    multiple
                    className="compose-attach-input"
                    onChange={(e) =>
                      setComposeFiles(Array.from(e.target.files ?? []))
                    }
                  />
                </label>
                {composeStoredAttachments.length > 0 ? (
                  <ul className="compose-attach-list">
                    {composeStoredAttachments.map((file) => (
                      <li key={file.filename}>
                        {file.filename} {t("composeDraftAttachment")}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {composeFiles.length > 0 ? (
                  <p className="mail-attach-hint">
                    {t("composeNewAttachments", {
                      count: composeFiles.length,
                      max: maxAttachmentMb,
                    })}
                  </p>
                ) : (
                  <p className="compose-attach-hint">{t("composeNoFileSelected")}</p>
                )}
              </div>

              {composeError ? (
                <p className="compose-premium-error">{composeError}</p>
              ) : null}
            </div>

            <footer className="compose-premium-footer">
              <div className="compose-actions compose-actions--premium">
                <button
                  type="button"
                  className="compose-btn compose-btn--ghost"
                  onClick={() => {
                    setComposeOpen(false);
                    resetCompose();
                  }}
                >
                  {t("composeCancel")}
                </button>
                {!forwardMessageId ? (
                  <button
                    type="button"
                    className="compose-btn compose-btn--secondary"
                    disabled={sending}
                    onClick={() => void saveComposeDraft()}
                  >
                    {t("composeSaveDraft")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="compose-btn compose-btn--secondary"
                  disabled={sending || composePreviewBusy}
                  onClick={() => void previewComposeOutbound()}
                >
                  {composePreviewBusy
                    ? t("composePreviewBusy")
                    : t("composeRecipientPreviewBtn")}
                </button>
                <button
                  type="button"
                  className="compose-btn compose-btn--primary"
                  disabled={sending}
                  onClick={() => void sendCompose()}
                >
                  {sending ? t("composeSending") : t("composeSend")}
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
      {composePreviewHtml ? (
        <div
          className="compose-overlay compose-overlay--premium compose-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t("composeEmailPreviewAria")}
        >
          <div className="compose-dialog compose-dialog--premium compose-preview-dialog">
            <header className="compose-premium-header">
              <h2>{t("composePreviewTitle")}</h2>
              <button
                type="button"
                className="compose-premium-close"
                onClick={closeComposePreview}
              >
                {t("actionClose")}
              </button>
            </header>
            <iframe
              className="compose-preview-frame"
              title={t("composeEmailPreviewAria")}
              sandbox=""
              srcDoc={composePreviewHtml}
            />
          </div>
        </div>
      ) : null}
      {settingsOpen && accessToken ? (
        <MailSettingsPanel
          accessToken={accessToken}
          initialView={settingsInitialView ?? undefined}
          deliverabilityDmarcFocus={mailDmarcAssistActive}
          notificationsPwaFocus={mailPwaAssistActive}
          deliverabilityEngagementFocus={mailEngagementAssistActive}
          mailOpsRunbookFocus={mailOpsAssistActive}
          onClose={() => {
            setSettingsOpen(false);
            setSettingsInitialView(null);
            setMailDmarcAssistActive(false);
            setMailPwaAssistActive(false);
            setMailEngagementAssistActive(false);
            setMailOpsAssistActive(false);
          }}
          onOpenCalendar={() => switchView("calendar")}
          onOpenContacts={() => switchView("contacts")}
          onInboxListDensityChange={setInboxListDensity}
          threadView={threadView}
          onThreadViewChange={setThreadView}
          onMailPostaPreferencesSaved={handleMailPostaPreferencesSaved}
          onAppLockChange={setMailAppLockEnabled}
          onPasskeysChange={setHasWebAuthnPasskeys}
          onInboxBrandingSaved={setInboxBranding}
          onUserCategoriesChanged={() => void refreshUserInboxCategories()}
        />
      ) : null}
      {accessToken ? (
        <MailAppLockOverlay
          accessToken={accessToken}
          appLockEnabled={mailAppLockEnabled}
          hasPasskeys={hasWebAuthnPasskeys}
        />
      ) : null}
      {shortcutsOpen ? (
        <MailShortcutsDialog onClose={() => setShortcutsOpen(false)} />
      ) : null}
      <MailCampaignResultDialog
        result={campaignResult}
        onClose={() => setCampaignResult(null)}
      />
    </div>
  );
}
