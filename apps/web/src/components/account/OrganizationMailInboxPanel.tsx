"use client";

import { useCallback, useEffect, useState } from "react";
import {
  composeCompanyMail,
  downloadCompanyMailAttachment,
  fetchCompanyMailInbox,
  fetchCompanyMailInboxMessage,
  markCompanyMailInboxRead,
  replyCompanyMail,
  fetchMailImapSettings,
  rotateMailImapPassword,
  type MailImapSettings,
  type ComposeAttachment,
  type MailInboxListItem,
  type MailInboxMessageDetail,
  type MailInboxSummary,
  type MailSentItem,
} from "../../lib/CompanyMailInboxApi";
import { useWebSession } from "../../context/WebSessionProvider";

type Folder = "inbox" | "spam" | "all";

function fileToAttachment(file: File): Promise<ComposeAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        contentBase64: base64,
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function OrganizationMailInboxPanel() {
  const { accessToken, session } = useWebSession();
  const isOwner = session?.roleCodes?.includes("COMPANY_OWNER") ?? false;
  const [folder, setFolder] = useState<Folder>("inbox");
  const [summary, setSummary] = useState<MailInboxSummary | null>(null);
  const [messages, setMessages] = useState<MailInboxListItem[]>([]);
  const [sent, setSent] = useState<MailSentItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailInboxMessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeText, setComposeText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [attachFiles, setAttachFiles] = useState<File[]>([]);
  const [toast, setToast] = useState("");
  const [imap, setImap] = useState<MailImapSettings | null>(null);
  const [imapPassword, setImapPassword] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const inbox = await fetchCompanyMailInbox(accessToken, folder);
      setSummary(inbox.summary);
      setMessages(inbox.messages);
      setSent(inbox.sent);
      if (isOwner) {
        setImap(await fetchMailImapSettings(accessToken));
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, folder, isOwner]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openMessage(id: string): Promise<void> {
    if (!accessToken) {
      return;
    }
    setSelectedId(id);
    const message = await fetchCompanyMailInboxMessage(accessToken, id);
    setDetail(message);
    setReplyText("");
    if (!message.readAt) {
      await markCompanyMailInboxRead(accessToken, id);
      void refresh();
    }
  }

  async function sendCompose(): Promise<void> {
    if (!accessToken || !isOwner) {
      return;
    }
    setToast("");
    const attachments =
      attachFiles.length > 0
        ? await Promise.all(attachFiles.map((f) => fileToAttachment(f)))
        : undefined;
    try {
      await composeCompanyMail(accessToken, {
        to: composeTo,
        subject: composeSubject,
        text: composeText,
        attachments,
      });
      setToast("Gönderildi.");
      setComposeOpen(false);
      setAttachFiles([]);
      void refresh();
    } catch {
      setToast("Gönderilemedi — limit veya kimlik hatası.");
    }
  }

  async function sendReply(): Promise<void> {
    if (!accessToken || !isOwner || !selectedId) {
      return;
    }
    const attachments =
      attachFiles.length > 0
        ? await Promise.all(attachFiles.map((f) => fileToAttachment(f)))
        : undefined;
    try {
      await replyCompanyMail(accessToken, selectedId, {
        text: replyText,
        attachments,
      });
      setToast("Yanıt gönderildi.");
      setAttachFiles([]);
      void refresh();
    } catch {
      setToast("Yanıt gönderilemedi.");
    }
  }

  if (!accessToken) {
    return null;
  }

  return (
    <section
      id="org-gelen-kutusu"
      className="account-card module-panel module-panel--elevated account-org-section"
    >
      <p className="account-verify-eyebrow">Faz C4 — Gelen / giden / IMAP</p>
      <h2 className="account-card-title">Kurumsal posta</h2>
      <p className="account-card-lead">
        Adres: <strong>{summary?.primaryAddress ?? "—"}</strong>
        {summary && summary.unreadCount > 0 ? (
          <> — {summary.unreadCount} okunmamış</>
        ) : null}
        {summary && summary.spamCount > 0 ? (
          <> — {summary.spamCount} spam</>
        ) : null}
      </p>

      <div className="account-verify-badges" style={{ marginBottom: "0.75rem" }}>
        {(["inbox", "spam", "all"] as Folder[]).map((f) => (
          <button
            key={f}
            type="button"
            className={
              folder === f
                ? "account-status-pill account-status-pill--ok"
                : "account-status-pill account-status-pill--pending"
            }
            onClick={() => {
              setFolder(f);
              setDetail(null);
              setSelectedId(null);
            }}
          >
            {f === "inbox" ? "Gelen" : f === "spam" ? "Spam" : "Tümü"}
          </button>
        ))}
        {isOwner ? (
          <button
            type="button"
            className="btn-account-secondary"
            onClick={() => setComposeOpen((v) => !v)}
          >
            Yeni mail
          </button>
        ) : null}
      </div>

      {isOwner && imap?.enabled ? (
        <div className="module-hint" style={{ marginBottom: "0.75rem" }}>
          IMAP: <code>{imap.imapHost}:{imap.imapPort}</code> — kullanıcı{" "}
          <code>{imap.username ?? "—"}</code>
          <button
            type="button"
            className="btn-account-ghost"
            style={{ marginLeft: "0.5rem" }}
            onClick={() => {
              if (!accessToken) {
                return;
              }
              void rotateMailImapPassword(accessToken).then((c) => {
                setImapPassword(c.password);
                setToast("IMAP şifresi oluşturuldu — kopyalayın (bir kez gösterilir).");
              });
            }}
          >
            IMAP şifresi oluştur
          </button>
          {imapPassword ? (
            <p>
              Şifre: <code>{imapPassword}</code>
            </p>
          ) : null}
        </div>
      ) : null}

      {composeOpen && isOwner ? (
        <div className="account-form-row" style={{ marginBottom: "1rem" }}>
          <input
            className="account-input"
            placeholder="Kime"
            value={composeTo}
            onChange={(e) => setComposeTo(e.target.value)}
          />
          <input
            className="account-input"
            placeholder="Konu"
            value={composeSubject}
            onChange={(e) => setComposeSubject(e.target.value)}
          />
          <textarea
            className="account-input"
            placeholder="Mesaj"
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
          />
          <input
            type="file"
            multiple
            onChange={(e) =>
              setAttachFiles(Array.from(e.target.files ?? []).slice(0, 3))
            }
          />
          <button
            type="button"
            className="btn-account-primary"
            onClick={() => void sendCompose()}
          >
            Gönder
          </button>
        </div>
      ) : null}

      {loading && !summary ? <p className="module-hint">Yükleniyor…</p> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)",
          gap: "1rem",
        }}
      >
        <div>
          <h3 className="account-card-title" style={{ fontSize: "0.95rem" }}>
            Gelen
          </h3>
          <ul className="module-hint" style={{ listStyle: "none", padding: 0 }}>
            {messages.map((row) => (
              <li key={row.id} style={{ marginBottom: "0.5rem" }}>
                <button
                  type="button"
                  className={
                    selectedId === row.id
                      ? "btn-account-primary"
                      : "btn-account-secondary"
                  }
                  style={{ width: "100%", textAlign: "left" }}
                  onClick={() => void openMessage(row.id)}
                >
                  <strong>
                    {row.readAt ? "" : "• "}
                    {row.spamStatus === "suspected" ? "⚠ " : ""}
                    {row.subject}
                  </strong>
                  <br />
                  <span style={{ fontSize: "0.85rem" }}>
                    {row.fromAddress}
                    {row.attachmentCount > 0
                      ? ` · ${row.attachmentCount} ek`
                      : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <h3
            className="account-card-title"
            style={{ fontSize: "0.95rem", marginTop: "1rem" }}
          >
            Giden
          </h3>
          <ul className="module-hint">
            {sent.map((row) => (
              <li key={row.id}>
                {row.subject} → {row.toAddress}
              </li>
            ))}
          </ul>
        </div>

        <div className="account-card" style={{ padding: "1rem" }}>
          {detail ? (
            <>
              <h3 className="account-card-title" style={{ fontSize: "1rem" }}>
                {detail.subject}
              </h3>
              <p className="module-hint">
                {detail.fromAddress} → {detail.emailAddress}
              </p>
              {detail.spamReason ? (
                <p className="module-hint">Spam: {detail.spamReason}</p>
              ) : null}
              {detail.bodyHtml ? (
                <iframe
                  title="HTML içerik"
                  sandbox=""
                  srcDoc={detail.bodyHtml}
                  style={{
                    width: "100%",
                    minHeight: "240px",
                    border: "1px solid #e2e8f0",
                    marginTop: "0.75rem",
                  }}
                />
              ) : (
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: "0.85rem",
                    marginTop: "0.75rem",
                  }}
                >
                  {detail.bodyText ?? detail.snippet ?? "(içerik yok)"}
                </pre>
              )}
              {detail.attachments.length > 0 ? (
                <ul className="module-hint">
                  {detail.attachments.map((att) => (
                    <li key={att.index}>
                      <button
                        type="button"
                        className="btn-account-ghost"
                        onClick={() => {
                          if (!accessToken) {
                            return;
                          }
                          void downloadCompanyMailAttachment(
                            accessToken,
                            detail.id,
                            att.index,
                          ).then((blob) => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = att.filename;
                            a.click();
                            URL.revokeObjectURL(url);
                          });
                        }}
                      >
                        İndir: {att.filename}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {isOwner && folder !== "spam" ? (
                <div style={{ marginTop: "1rem" }}>
                  <textarea
                    className="account-input"
                    placeholder="Yanıt yazın…"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      setAttachFiles(
                        Array.from(e.target.files ?? []).slice(0, 3),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="btn-account-primary"
                    onClick={() => void sendReply()}
                  >
                    Yanıtla
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="module-hint">Mesaj seçin veya yeni mail yazın.</p>
          )}
        </div>
      </div>
      {toast ? <p className="account-save-message">{toast}</p> : null}
    </section>
  );
}
