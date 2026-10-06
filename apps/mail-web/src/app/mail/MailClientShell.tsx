"use client";

import { MailSettingsPanel } from "./MailSettingsPanel";
import { MailEmptyState } from "./MailEmptyState";
import { MailShortcutsDialog } from "./MailShortcutsDialog";
import { MailCalendarPanel } from "./MailCalendarPanel";
import { MailContactsPanel } from "./MailContactsPanel";
import { ComposeRichEditor } from "./ComposeRichEditor";
import { MailInboxMessageRow } from "./MailInboxMessageRow";
import { MailListSwipeRow } from "./MailListSwipeRow";
import type { MailClientController } from "./useMailClientController";
import { formatMailListDate } from "@/lib/mailDisplay";
import {
  deleteCustomFolder,
  deleteDraft,
  fetchClassifyMessage,
  fetchSentMessage,
  fetchSummarizeMessage,
  fetchSuggestComposeDraft,
  fetchSuggestReply,
  renameCustomFolder,
  sendDraft,
  unsnoozeMailMessage,
} from "@/lib/mailApi";

type Props = { mail: MailClientController };

export function MailClientShell({ mail }: Props) {
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
    applyDelayedSend,
    applyMessageReadLocal,
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
    composeRich,
    composeAiAssistActive,
    composeAiDraftBusy,
    composeShowCcBcc,
    composeSignatures,
    composeStoredAttachments,
    composeSubject,
    composeTemplates,
    composeText,
    composeTo,
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
    ensureAiMailConsent,
    filteredSent,
    forwardMessageId,
    inboxBranding,
    inboxCustomFolderId,
    inboxFolder,
    inboxListDensity,
    inboxOffline,
    inboxOfflineCachedAt,
    isPrimaryInbox,
    listItems,
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
    purgeCurrentMessage,
    refresh,
    refreshCustomFolders,
    refreshDrafts,
    removeMessageFromLocalLists,
    replyAllMode,
    replyBcc,
    replyFiles,
    replyText,
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
    selectedId,
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
    shortcutsOpen,
    snoozeSelected,
    startForwardFromDetail,
    storageAtLimit,
    summary,
    swipeArchiveLabel,
    swipeRowArchive,
    swipeRowDelete,
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

  return (
    <div
      className={`mail-app mobile-pane-${mobilePane}${embedMode ? " mail-app--embed" : ""}${inboxListDensity === "compact" ? " mail-app--list-compact" : ""}`}
    >
      {(inboxOffline || detailOffline) ? (
        <div className="mail-offline-banner" role="status">
          Çevrimdışı önbellek — salt okunur
          {inboxOfflineCachedAt
            ? ` · ${new Date(inboxOfflineCachedAt).toLocaleString("tr-TR")}`
            : ""}
        </div>
      ) : null}
      <div className="mail-mobile-bar">
        <button type="button" onClick={() => setMobilePane("nav")}>
          Menü
        </button>
        <button type="button" onClick={() => setMobilePane("list")}>
          Liste
        </button>
        {selectedId ? (
          <button type="button" onClick={() => setMobilePane("read")}>
            Mesaj
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
                "Kurumsal e-posta"}
            </span>
          ) : inboxBranding?.allowed && inboxBranding.emailBrandTitle ? (
            <span className="mail-brand-title-only">
              {inboxBranding.emailBrandTitle}
            </span>
          ) : (
            <>
              <strong>Lerta</strong> Posta
            </>
          )}
        </div>
        <button
          type="button"
          className="mail-compose-btn"
          disabled={storageAtLimit}
          title={
            storageAtLimit
              ? "Depolama kotası dolu — önce arşivleyin veya silin"
              : undefined
          }
          onClick={() => {
            resetCompose();
            setComposeOpen(true);
          }}
        >
          Yaz
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
            Gelen
            {summary && summary.unreadCount > 0
              ? ` (${summary.unreadCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "sent" ? "active" : ""}
            onClick={() => switchView("sent")}
          >
            Gönderilen
          </button>
          <button
            type="button"
            className={view === "all" ? "active" : ""}
            onClick={() => switchView("all")}
          >
            Tümü
          </button>
          <button
            type="button"
            className={view === "starred" ? "active" : ""}
            onClick={() => switchView("starred")}
          >
            Yıldızlı
            {summary && (summary.starredCount ?? 0) > 0
              ? ` (${summary.starredCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "snoozed" ? "active" : ""}
            onClick={() => switchView("snoozed")}
          >
            Ertelenen
            {summary && (summary.snoozedCount ?? 0) > 0
              ? ` (${summary.snoozedCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "spam" ? "active" : ""}
            onClick={() => switchView("spam")}
          >
            Spam
            {summary && summary.spamCount > 0 ? ` (${summary.spamCount})` : ""}
          </button>
          <button
            type="button"
            className={view === "archive" ? "active" : ""}
            onClick={() => switchView("archive")}
          >
            Arşiv
            {summary && (summary.archiveCount ?? 0) > 0
              ? ` (${summary.archiveCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "trash" ? "active" : ""}
            onClick={() => switchView("trash")}
          >
            Çöp
            {summary && (summary.trashCount ?? 0) > 0
              ? ` (${summary.trashCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "drafts" ? "active" : ""}
            onClick={() => switchView("drafts")}
          >
            Taslaklar
            {drafts.length > 0 ? ` (${drafts.length})` : ""}
          </button>
          <button
            type="button"
            className={view === "calendar" ? "active" : ""}
            onClick={() => switchView("calendar")}
          >
            Takvim
          </button>
          <button
            type="button"
            className={view === "contacts" ? "active" : ""}
            onClick={() => switchView("contacts")}
          >
            Kişiler
          </button>
          {customFolders.length > 0 ? (
            <div className="mail-custom-folders-label">Özel klasörler</div>
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
                title="Yeniden adlandır"
                onClick={() => {
                  const next = window.prompt("Yeni klasör adı", f.name);
                  if (!next?.trim() || !accessToken || next.trim() === f.name) {
                    return;
                  }
                  void renameCustomFolder(accessToken, f.id, next.trim()).then(
                    () => {
                      setToast("Klasör güncellendi.");
                      void refreshCustomFolders();
                    },
                    (error: unknown) => {
                      setToast(
                        error instanceof Error
                          ? error.message
                          : "Klasör güncellenemedi.",
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
                title="Klasörü sil"
                onClick={() => {
                  if (
                    !accessToken ||
                    !window.confirm(
                      `"${f.name}" silinsin mi? İçindeki postalar Gelen'e döner.`,
                    )
                  ) {
                    return;
                  }
                  void deleteCustomFolder(accessToken, f.id).then(
                    () => {
                      if (activeCustomFolderId === f.id) {
                        setActiveCustomFolderId(null);
                      }
                      setToast("Klasör silindi.");
                      void refreshCustomFolders();
                      void refresh();
                    },
                    (error: unknown) => {
                      setToast(
                        error instanceof Error
                          ? error.message
                          : "Klasör silinemedi.",
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
            aria-label="Yeni özel klasör"
            title="Yeni özel klasör"
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
            aria-label="Ayarlar: IMAP, imza, iki adımlı doğrulama"
            title="Ayarlar (IMAP · imza · 2FA)"
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
                Depolama kotası dolu — yeni gönderim ve ekler engellenebilir.
                Arşivleyin veya plan yükseltin.
              </p>
            ) : summary.storageQuota.nearLimit ? (
              <p className="mail-storage-warn">
                Depolama kotasına yaklaşıyorsunuz. Eski postaları arşivleyin veya
                silin.
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
            Çıkış
          </button>
          {process.env.NEXT_PUBLIC_DEPLOY_SHA ? (
            <span
              className="mail-deploy-sha"
              title={process.env.NEXT_PUBLIC_DEPLOY_TIME}
            >
              Sürüm {process.env.NEXT_PUBLIC_DEPLOY_SHA}
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
        className={`mail-list${isPrimaryInbox ? " mail-list-inbox-premium" : ""}`}
      >
        {view !== "drafts" ? (
          <div
            className={`mail-search${isPrimaryInbox ? " mail-inbox-search-premium" : ""}`}
          >
            {isPrimaryInbox ? (
              <header className="mail-inbox-header">
                <div className="mail-inbox-header-text">
                  <h2 className="mail-inbox-header-title">Gelen kutusu</h2>
                  <p className="mail-inbox-header-meta">
                    {summary && summary.unreadCount > 0
                      ? `${summary.unreadCount} okunmamış`
                      : "Tüm mesajlar okundu"}
                  </p>
                </div>
              </header>
            ) : null}
            {mailBulkAssistActive ? (
              <p className="mail-parity-assist-banner" role="status">
                Toplu işlem: listedeki kutularla seçim yapın; okundu, arşiv, çöp ve
                klasör taşıma araç çubuğu açılır.{" "}
                <button
                  type="button"
                  className="mail-parity-assist-dismiss"
                  onClick={() => setMailBulkAssistActive(false)}
                >
                  Kapat
                </button>
              </p>
            ) : null}
            {mailSwipeAssistActive ? (
              <p className="mail-parity-assist-banner mail-parity-assist-banner--swipe" role="status">
                Kaydırma: satırı sağa/sola kaydırarak {swipeArchiveLabel} veya çöp
                kutusuna gönderin (mobil ve trackpad).{" "}
                <button
                  type="button"
                  className="mail-parity-assist-dismiss"
                  onClick={() => setMailSwipeAssistActive(false)}
                >
                  Kapat
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
                  Konuşma
                </label>
              ) : null}
              {canBulkSelect && listItems.length > 0 ? (
                <label className="mail-bulk-check">
                  <input
                    type="checkbox"
                    checked={allListSelected}
                    onChange={toggleSelectAll}
                    aria-label="Tümünü seç"
                  />
                </label>
              ) : null}
              {canBulkSelect && checkedIds.size > 0 ? (
                <span className="mail-bulk-actions">
                  <button type="button" onClick={() => void runBulkMarkRead(false)}>
                    Okundu
                  </button>
                  <button type="button" onClick={() => void runBulkMarkRead(true)}>
                    Okunmadı
                  </button>
                  <button type="button" onClick={() => void runBulkFolder("archive")}>
                    Arşiv
                  </button>
                  <button type="button" onClick={() => void runBulkFolder("trash")}>
                    Çöp
                  </button>
                  {view !== "trash" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void runBulkStar(true)}
                      >
                        Yıldızla
                      </button>
                      <button
                        type="button"
                        onClick={() => void runBulkStar(false)}
                      >
                        Yıldız kaldır
                      </button>
                      <select
                        className="mail-bulk-folder-select"
                        defaultValue=""
                        aria-label="Seçilenleri ertele"
                        onChange={(e) => {
                          const v = e.target.value;
                          e.target.value = "";
                          if (!v) {
                            return;
                          }
                          void runBulkSnooze(Number(v));
                        }}
                      >
                        <option value="">Ertele…</option>
                        <option value="1">1 saat</option>
                        <option value="3">3 saat</option>
                        <option value="24">1 gün</option>
                        <option value="168">1 hafta</option>
                      </select>
                    </>
                  ) : null}
                  {view === "inbox" || activeCustomFolderId ? (
                    <select
                      className="mail-bulk-folder-select"
                      defaultValue=""
                      aria-label="Özel klasöre taşı"
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
                      <option value="">Klasöre taşı…</option>
                      <option value="__inbox__">Gelen (klasörsüz)</option>
                      {customFolders.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  ) : null}
                </span>
              ) : null}
              <button type="button" className="mail-toolbar-btn" onClick={() => void refresh()}>
                Yenile
              </button>
              <button
                type="button"
                className="mail-toolbar-btn"
                onClick={() => setShortcutsOpen(true)}
                title="Klavye kısayolları"
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
                    ? "Gelen kutusunda ara…"
                    : "Ara (konu, gönderen)…"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Posta ara"
              />
            </div>
            <button
              type="button"
              className="mail-search-filters-toggle"
              onClick={() => setSearchFiltersOpen((open) => !open)}
            >
              {searchFiltersOpen ? "Filtreleri gizle" : "Gelişmiş filtre"}
            </button>
            {searchFiltersOpen ? (
              <div className="mail-search-filters">
                <label>
                  Gönderen
                  <input
                    type="text"
                    placeholder="ornek@firma.com"
                    value={searchFrom}
                    onChange={(e) => setSearchFrom(e.target.value)}
                  />
                </label>
                <label>
                  Başlangıç
                  <input
                    type="date"
                    value={searchDateFrom}
                    onChange={(e) => setSearchDateFrom(e.target.value)}
                  />
                </label>
                <label>
                  Bitiş
                  <input
                    type="date"
                    value={searchDateTo}
                    onChange={(e) => setSearchDateTo(e.target.value)}
                  />
                </label>
                <label>
                  Ek
                  <select
                    value={searchHasAttachment}
                    onChange={(e) =>
                      setSearchHasAttachment(
                        e.target.value as "any" | "yes" | "no",
                      )
                    }
                  >
                    <option value="any">Fark etmez</option>
                    <option value="yes">Ek var</option>
                    <option value="no">Ek yok</option>
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
                  Filtreleri temizle
                </button>
              </div>
            ) : null}
            {searchActive && searchResults !== null ? (
              <p className="mail-search-hint">
                {searchResults.length} sonuç
              </p>
            ) : null}
          </div>
        ) : null}
        {listItems.length === 0 ? (
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
                  archiveLabel={swipeArchiveLabel}
                  onArchive={() =>
                    void swipeRowArchive(m.id, relatedInbound)
                  }
                  onDelete={() => void swipeRowDelete(m.id)}
                >
                  <MailInboxMessageRow
                    message={{
                      ...m,
                      starredAt:
                        "starredAt" in m ? m.starredAt ?? null : null,
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
              showArchive={view === "trash" ? true : view !== "sent"}
              archiveLabel={swipeArchiveLabel}
              onArchive={() =>
                void swipeRowArchive(m.id, relatedInbound, rowMessageKind)
              }
              onDelete={() => void swipeRowDelete(m.id, rowMessageKind)}
            >
            <div
              role="button"
              tabIndex={0}
              className={`mail-list-item ${selectedId === m.id ? "selected" : ""} ${unread ? "unread" : "read"}`}
              onClick={() => {
                if (view === "drafts") {
                  const d = drafts.find((x) => x.id === m.id);
                  if (d) {
                    setSelectedId(m.id);
                    setDraftPreview(d);
                    setDetail(null);
                    setSentPreview(null);
                  }
                  return;
                }
                if (view === "sent") {
                  setSelectedId(m.id);
                  setDetail(null);
                  setSentLoading(true);
                  setSentPreview(null);
                  void (async () => {
                    if (!accessToken) {
                      return;
                    }
                    try {
                      setSentPreview(
                        await fetchSentMessage(accessToken, m.id),
                      );
                    } catch {
                      const s = sent.find((x) => x.id === m.id);
                      setSentPreview(
                        s
                          ? {
                              ...s,
                              fromAddress: summary?.primaryAddress ?? "—",
                              bodyText: null,
                              smtpMessageId: null,
                            }
                          : null,
                      );
                    } finally {
                      setSentLoading(false);
                    }
                  })();
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
                  aria-label="Mesajı seç"
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
                      ? "Yıldızı kaldır"
                      : "Yıldızla"
                  }
                  title={
                    "starredAt" in m && m.starredAt
                      ? "Yıldızı kaldır"
                      : "Yıldızla"
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
      </section>

      <section className="mail-read mail-read--premium">
        {pendingUndo ? (
          <div className="mail-undo-bar">
            <span>
              Gönderiliyor… {undoSecondsLeft > 0 ? `${undoSecondsLeft}s` : ""}
            </span>
            <button type="button" onClick={() => void cancelPendingUndo()}>
              Geri al
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
          <p className="mail-empty">Yükleniyor…</p>
        ) : sentPreview ? (
          <>
            <header className="mail-read-header">
              <h1>{sentPreview.subject}</h1>
              <div className="mail-read-meta">
                Kime: {sentPreview.toAddress} ·{" "}
                {new Date(sentPreview.sentAt).toLocaleString("tr-TR")}
              </div>
            </header>
            <div className="mail-read-body">
              <pre>{sentPreview.bodyText ?? "(İçerik yok)"}</pre>
            </div>
          </>
        ) : draftPreview ? (
          <>
            <header className="mail-read-header">
              <h1>{draftPreview.subject || "(Konu yok)"}</h1>
              <div className="mail-read-meta">
                Kime: {draftPreview.to ?? "—"} · Güncellendi:{" "}
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
                Düzenle
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
                        { delaySeconds: 5 },
                      );
                      if (applyDelayedSend(draftResult)) {
                        setDraftPreview(null);
                        setSelectedId(null);
                        return;
                      }
                      setToast("Gönderildi.");
                      setDraftPreview(null);
                      setSelectedId(null);
                      void refresh();
                      void refreshDrafts();
                      setView("sent");
                    } catch (error) {
                      setToast(
                        error instanceof Error
                          ? error.message
                          : "Gönderilemedi.",
                      );
                    }
                  })();
                }}
              >
                Gönder
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
                Sil
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
                Kimden: {detail.fromAddress} ·{" "}
                {new Date(detail.receivedAt).toLocaleString("tr-TR")}
                {detail.spamReason ? ` · ${detail.spamReason}` : ""}
                {detail.snoozedUntil &&
                new Date(detail.snoozedUntil).getTime() > Date.now()
                  ? ` · Ertelenmiş: ${new Date(detail.snoozedUntil).toLocaleString("tr-TR")}`
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
                <iframe
                  title="Mesaj içeriği"
                  className="mail-html-frame"
                  sandbox=""
                  srcDoc={detail.bodyHtml}
                />
              ) : (
                <pre>{detail.bodyText ?? ""}</pre>
              )}
            </div>
            <div
              className="mail-read-toolbar"
              role="toolbar"
              aria-label="Mesaj işlemleri"
            >
              {detail.mailboxFolder !== "trash" ? (
                <button
                  type="button"
                  className={`mail-read-tool-btn ${detail.starredAt ? "is-active" : ""}`}
                  onClick={() => void toggleCurrentStarred()}
                >
                  {detail.starredAt ? "★ Yıldızlı" : "☆ Yıldızla"}
                </button>
              ) : null}
              {view === "trash" || detail.mailboxFolder === "trash" ? (
                <>
                  <button
                    type="button"
                    className="mail-read-tool-btn"
                    onClick={() => void moveCurrentMessage("inbox")}
                  >
                    Geri al
                  </button>
                  <button
                    type="button"
                    className="mail-read-tool-btn mail-read-tool-btn--danger"
                    onClick={() => void purgeCurrentMessage()}
                  >
                    Kalıcı sil
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
                      Arşivle
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mail-read-tool-btn"
                      onClick={() => void moveCurrentMessage("inbox")}
                    >
                      Gelen kutusuna taşı
                    </button>
                  )}
                  <button
                    type="button"
                    className="mail-read-tool-btn"
                    onClick={() => void moveCurrentMessage("trash")}
                  >
                    Sil
                  </button>
                  {detail.readAt ? (
                    <button
                      type="button"
                      className="mail-read-tool-btn"
                      onClick={() => void markCurrentUnread()}
                    >
                      Okunmadı
                    </button>
                  ) : null}
                </>
              )}
            </div>
            {view !== "sent" && view !== "trash" ? (
              <div className="mail-reply mail-reply--premium">
                <div className="mail-reply-premium-head">
                  <h3 className="mail-reply-premium-title">Yanıt</h3>
                  {replyAllMode ? (
                    <span className="mail-reply-all-badge">Tümüne yanıt (a)</span>
                  ) : null}
                </div>
                <div className="compose-field mail-reply-field">
                  <label className="compose-field-label" htmlFor="reply-bcc">
                    Bcc
                  </label>
                  <input
                    id="reply-bcc"
                    type="text"
                    placeholder="Gizli kopya, virgülle ayırın"
                    value={replyBcc}
                    onChange={(e) => setReplyBcc(e.target.value)}
                    className="compose-input"
                  />
                </div>
                <textarea
                  className="compose-textarea mail-reply-textarea"
                  placeholder="Yanıtınızı yazın…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                />
                <div className="compose-attach-zone mail-reply-attach">
                  <label className="compose-attach-label">
                    <span className="compose-attach-title">Ek</span>
                    <span className="compose-attach-btn">Dosya seç</span>
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
                      {replyFiles.length} ek (en fazla 3, {maxAttachmentMb} MB)
                    </p>
                  ) : (
                    <p className="compose-attach-hint">Dosya seçilmedi</p>
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
                          setToast("Erteleme kaldırıldı.");
                          void refresh();
                          void openMessage(selectedId);
                        },
                      )
                    }
                  >
                    Ertelemeyi kaldır
                  </button>
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
                                ? "AI yanıt önerisi eklendi."
                                : "Yanıt şablonu eklendi.",
                            );
                          })
                          .catch(() => setToast("Öneri alınamadı."))
                          .finally(() => setAiSuggestBusy(false));
                      }}
                    >
                      {aiSuggestBusy ? "Öneri…" : "Yanıt öner"}
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
                              setToast(`Özet (${result.provider}): ${result.summary.slice(0, 120)}…`);
                            }
                          })
                          .catch(() => setToast("Özet alınamadı."))
                          .finally(() => setAiSuggestBusy(false));
                      }}
                    >
                      Özet
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
                              setToast(`Sınıf: ${result.label} (${result.provider})`);
                            }
                          })
                          .catch(() => setToast("Sınıflandırma başarısız."))
                          .finally(() => setAiSuggestBusy(false));
                      }}
                    >
                      Sınıfla
                    </button>
                    <button
                      type="button"
                      className="compose-btn compose-btn--primary"
                      onClick={() => void sendReply(false)}
                    >
                      Yanıtla
                    </button>
                    <button
                      type="button"
                      className="compose-btn compose-btn--secondary"
                      onClick={() => void sendReply(true)}
                    >
                      Tümüne yanıtla
                    </button>
                  </div>
                  <div className="mail-reply-action-group mail-reply-action-group--end">
                    <select
                      className="compose-select mail-snooze-select"
                      defaultValue=""
                      aria-label="Ertele"
                      onChange={(e) => {
                        const hours = Number(e.target.value);
                        if (hours > 0) {
                          void snoozeSelected(hours);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">Ertele…</option>
                      <option value="1">1 saat</option>
                      <option value="3">3 saat</option>
                      <option value="24">Yarın</option>
                      <option value="168">1 hafta</option>
                    </select>
                    <button
                      type="button"
                      className="compose-btn compose-btn--ghost"
                      onClick={() => startForwardFromDetail()}
                    >
                      İlet
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
                    ? "İlet"
                    : editingDraftId
                      ? "Taslak düzenle"
                      : "Yeni mesaj"}
                </h2>
                <p className="compose-premium-subtitle">
                  {summary?.primaryAddress
                    ? `Gönderen: ${summary.primaryAddress}`
                    : "Kurumsal gönderim"}
                </p>
              </div>
              <button
                type="button"
                className="compose-premium-close"
                aria-label="Kapat"
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
                  AI yazım: konu satırına göre gövde önerisi (KVKK onayı gerekir).
                  Gelen kutusunda yanıt öner / özet / sınıfla da kullanılabilir.{" "}
                  <button
                    type="button"
                    className="mail-parity-assist-dismiss"
                    onClick={() => setComposeAiAssistActive(false)}
                  >
                    Kapat
                  </button>
                </p>
              ) : null}
              <div className="compose-field">
                <label className="compose-field-label" htmlFor="compose-to">
                  Kime
                </label>
                <input
                  id="compose-to"
                  className="compose-input"
                  placeholder="ornek@firma.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  autoFocus
                />
              </div>

              {!forwardMessageId ? (
                <div className="compose-premium-inline-tools">
                  <button
                    type="button"
                    className="compose-chip-btn"
                    onClick={() => setComposeShowCcBcc((open) => !open)}
                  >
                    {composeShowCcBcc ? "Cc/Bcc gizle" : "Cc / Bcc"}
                  </button>
                </div>
              ) : null}

              {!forwardMessageId && composeShowCcBcc ? (
                <>
                  <div className="compose-field">
                    <label className="compose-field-label" htmlFor="compose-cc">
                      Cc
                    </label>
                    <input
                      id="compose-cc"
                      className="compose-input"
                      placeholder="Virgülle ayırın"
                      value={composeCc}
                      onChange={(e) => setComposeCc(e.target.value)}
                    />
                  </div>
                  <div className="compose-field">
                    <label className="compose-field-label" htmlFor="compose-bcc">
                      Bcc
                    </label>
                    <input
                      id="compose-bcc"
                      className="compose-input"
                      placeholder="Virgülle ayırın"
                      value={composeBcc}
                      onChange={(e) => setComposeBcc(e.target.value)}
                    />
                  </div>
                </>
              ) : null}

              {forwardMessageId ? (
                <p className="mail-compose-forward-hint compose-premium-forward">
                  Konu: <strong>{composeSubject}</strong> — orijinal metin
                  otomatik eklenir.
                </p>
              ) : (
                <div className="compose-field">
                  <label className="compose-field-label" htmlFor="compose-subject">
                    Konu
                  </label>
                  <input
                    id="compose-subject"
                    className="compose-input"
                    placeholder="Mesaj konusu"
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
                            setToast(
                              "AI asistanı için Gizlilik ayarlarından onay verin.",
                            );
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
                              ? "AI gövde önerisi eklendi."
                              : "Şablon gövde eklendi.",
                          );
                        })
                        .catch(() => setToast("AI öneri alınamadı."))
                        .finally(() => setComposeAiDraftBusy(false));
                    }}
                  >
                    {composeAiDraftBusy ? "AI…" : "AI gövde öner"}
                  </button>
                ) : null}
                <label className="compose-preset-label">
                  <span>Şablon</span>
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
                    <option value="">Seç…</option>
                    {composeTemplates.some((t) => t.isSystem) ? (
                      <optgroup label="Hazır şablonlar">
                        {composeTemplates
                          .filter((t) => t.isSystem)
                          .map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                      </optgroup>
                    ) : null}
                    {composeTemplates.some((t) => !t.isSystem) ? (
                      <optgroup label="Kurumsal">
                        {composeTemplates
                          .filter((t) => !t.isSystem)
                          .map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                      </optgroup>
                    ) : null}
                  </select>
                </label>
                <label className="compose-preset-label">
                  <span>İmza</span>
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
                    <option value="">Ekle…</option>
                    {composeSignatures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.isDefault ? " ★" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="compose-premium-editor-wrap">
                {!forwardMessageId && !editingDraftId ? (
                  <ComposeRichEditor
                    enabled={composeRich}
                    onEnabledChange={setComposeRich}
                    plainText={composeText}
                    onPlainTextChange={setComposeText}
                    onHtmlChange={setComposeHtml}
                  />
                ) : null}
                {!composeRich || forwardMessageId || editingDraftId ? (
                  <textarea
                    className="compose-textarea"
                    placeholder={
                      forwardMessageId
                        ? "Üst not (isteğe bağlı)…"
                        : "Mesajınızı yazın…"
                    }
                    rows={8}
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                  />
                ) : null}
              </div>

              <div className="compose-attach-zone">
                <label className="compose-attach-label">
                  <span className="compose-attach-title">Ekler</span>
                  <span className="compose-attach-btn">Dosya seç</span>
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
                      <li key={file.filename}>{file.filename} (taslakta)</li>
                    ))}
                  </ul>
                ) : null}
                {composeFiles.length > 0 ? (
                  <p className="mail-attach-hint">
                    {composeFiles.length} yeni ek (en fazla {maxAttachmentMb}{" "}
                    MB)
                  </p>
                ) : (
                  <p className="compose-attach-hint">Dosya seçilmedi</p>
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
                  İptal
                </button>
                {!forwardMessageId ? (
                  <button
                    type="button"
                    className="compose-btn compose-btn--secondary"
                    disabled={sending}
                    onClick={() => void saveComposeDraft()}
                  >
                    Taslak kaydet
                  </button>
                ) : null}
                <button
                  type="button"
                  className="compose-btn compose-btn--primary"
                  disabled={sending}
                  onClick={() => void sendCompose()}
                >
                  {sending ? "Gönderiliyor…" : "Gönder"}
                </button>
              </div>
            </footer>
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
          onClose={() => {
            setSettingsOpen(false);
            setSettingsInitialView(null);
            setMailDmarcAssistActive(false);
            setMailPwaAssistActive(false);
            setMailEngagementAssistActive(false);
          }}
          onOpenCalendar={() => switchView("calendar")}
          onOpenContacts={() => switchView("contacts")}
          onInboxListDensityChange={setInboxListDensity}
        />
      ) : null}
      {shortcutsOpen ? (
        <MailShortcutsDialog onClose={() => setShortcutsOpen(false)} />
      ) : null}
    </div>
  );
}
