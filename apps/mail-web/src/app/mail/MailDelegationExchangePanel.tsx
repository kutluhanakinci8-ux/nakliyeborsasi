"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addMailboxDelegate,
  completeExchangeOAuth,
  deleteExchangeAccount,
  fetchMailAccountHub,
  removeMailboxDelegate,
  startExchangeOAuth,
  syncAllExchangeAccounts,
  syncExchangeAccount,
  updateMailboxAccessMode,
  type MailAccountHubPayload,
  type MailMailboxDelegatePermission,
} from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  accessToken: string;
  hub: MailAccountHubPayload;
  onHubChange: (hub: MailAccountHubPayload) => void;
};

function delegatePermissionLabel(
  permission: MailMailboxDelegatePermission,
  t: (key: string) => string,
): string {
  switch (permission) {
    case "read":
      return t("permRead");
    case "send":
      return t("permSend");
    case "manage":
      return t("permManage");
  }
}

export function MailDelegationExchangePanel({
  accessToken,
  hub,
  onHubChange,
}: Props) {
  const { t, formatDateTime } = useMailLocale();
  const [delegateEmail, setDelegateEmail] = useState("");
  const [delegatePermission, setDelegatePermission] =
    useState<MailMailboxDelegatePermission>("send");
  const [activeMailboxId, setActiveMailboxId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const mailboxes = hub.mailboxDelegations ?? [];
  const canManage = hub.canManageMailboxDelegations ?? false;
  const exchange = hub.exchangeSync;

  useEffect(() => {
    if (!activeMailboxId && mailboxes.length > 0) {
      setActiveMailboxId(mailboxes[0].mailboxId);
    }
  }, [activeMailboxId, mailboxes]);

  const reloadHub = useCallback(async () => {
    const next = await fetchMailAccountHub(accessToken);
    onHubChange(next);
  }, [accessToken, onHubChange]);

  const selected =
    mailboxes.find((m) => m.mailboxId === activeMailboxId) ?? mailboxes[0];

  async function handleAccessMode(
    mode: "organization" | "delegates_only",
  ): Promise<void> {
    if (!selected) return;
    setError("");
    setStatus("");
    try {
      await updateMailboxAccessMode(accessToken, selected.mailboxId, mode);
      await reloadHub();
      setStatus(
        mode === "delegates_only"
          ? t("exchangeModeDelegatesSet")
          : t("exchangeModeOrgSet"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errGenericSave"));
    }
  }

  async function handleAddDelegate(): Promise<void> {
    if (!selected || !delegateEmail.trim()) return;
    setError("");
    setStatus("");
    try {
      await addMailboxDelegate(
        accessToken,
        selected.mailboxId,
        delegateEmail.trim(),
        delegatePermission,
      );
      setDelegateEmail("");
      await reloadHub();
      setStatus(t("exchangeDelegateAdded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("exchangeErrAdded"));
    }
  }

  async function handleRemoveDelegate(delegateId: string): Promise<void> {
    if (!selected) return;
    setError("");
    try {
      await removeMailboxDelegate(accessToken, selected.mailboxId, delegateId);
      await reloadHub();
      setStatus(t("exchangeDelegateRemoved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("exchangeErrRemoved"));
    }
  }

  async function handleExchangeConnect(): Promise<void> {
    setError("");
    setStatus("");
    try {
      const { authorizationUrl, state } = await startExchangeOAuth(accessToken);
      const popup = window.open(
        authorizationUrl,
        "lerta-exchange-oauth",
        "width=520,height=720",
      );
      if (!popup) {
        window.location.assign(authorizationUrl);
        return;
      }
      const onMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const data = event.data as {
          type?: string;
          code?: string;
          oauthState?: string;
        };
        if (data.type !== "lerta-exchange-oauth") return;
        window.removeEventListener("message", onMessage);
        if (!data.code) {
          setError(t("exchangeMsOAuthIncomplete"));
          return;
        }
        await completeExchangeOAuth(
          accessToken,
          data.code,
          data.oauthState ?? state,
        );
        await reloadHub();
        setStatus(t("exchangeConnected"));
      };
      window.addEventListener("message", onMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("exchangeConnectErr"));
    }
  }

  async function handleExchangeSync(accountId: string): Promise<void> {
    setError("");
    try {
      const result = await syncExchangeAccount(accessToken, accountId);
      await reloadHub();
      setStatus(
        t("exchangeSyncResult", {
          imported: result.imported,
          updated: result.updated,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settingsSyncFailed"));
    }
  }

  async function handleExchangeSyncAll(): Promise<void> {
    setError("");
    try {
      const result = await syncAllExchangeAccounts(accessToken);
      await reloadHub();
      setStatus(
        t("exchangeSyncAllResult", {
          accounts: result.accounts,
          imported: result.imported,
          updated: result.updated,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settingsSyncFailed"));
    }
  }

  async function handleExchangeDelete(accountId: string): Promise<void> {
    setError("");
    try {
      await deleteExchangeAccount(accessToken, accountId);
      await reloadHub();
      setStatus(t("exchangeRemoved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("exchangeErrRemoved"));
    }
  }

  return (
    <>
      <section className="mail-posta-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">
            {t("exchangeDelegationTitle")}
          </h3>
          <p className="mail-posta-card-desc">{t("exchangeDelegationDesc")}</p>
        </header>
        {mailboxes.length === 0 ? (
          <p className="mail-accounts-muted">{t("exchangeNoMailbox")}</p>
        ) : (
          <>
            <div className="mail-delegation-mailbox-picker">
              <label className="mail-posta-label" htmlFor="mailbox-pick">
                {t("exchangeMailboxLabel")}
              </label>
              <select
                id="mailbox-pick"
                className="mail-posta-select"
                value={selected?.mailboxId ?? ""}
                onChange={(e) => setActiveMailboxId(e.target.value)}
              >
                {mailboxes.map((m) => (
                  <option key={m.mailboxId} value={m.mailboxId}>
                    {m.emailAddress}
                  </option>
                ))}
              </select>
            </div>
            {selected ? (
              <>
                <p className="mail-accounts-muted">
                  {t("exchangeAccessLabel")}:{" "}
                  {selected.accessMode === "delegates_only"
                    ? t("exchangeAccessDelegates")
                    : t("exchangeAccessOrg")}
                  {selected.ownerEmail
                    ? t("exchangeOwnerSuffix", { email: selected.ownerEmail })
                    : null}
                </p>
                {canManage ? (
                  <div className="mail-delegation-mode-actions">
                    <button
                      type="button"
                      className="mail-premium-btn mail-premium-btn--ghost"
                      disabled={selected.accessMode === "organization"}
                      onClick={() => void handleAccessMode("organization")}
                    >
                      {t("exchangeModeOrg")}
                    </button>
                    <button
                      type="button"
                      className="mail-premium-btn mail-premium-btn--ghost"
                      disabled={selected.accessMode === "delegates_only"}
                      onClick={() => void handleAccessMode("delegates_only")}
                    >
                      {t("exchangeModeDelegates")}
                    </button>
                  </div>
                ) : null}
                <ul className="mail-accounts-list--premium">
                  {selected.delegates.map((d) => (
                    <li key={d.id} className="mail-accounts-card">
                      <div className="mail-accounts-card-main">
                        <span className="mail-accounts-card-email">
                          {d.emailAddress}
                        </span>
                        <span className="mail-accounts-card-name">
                          {delegatePermissionLabel(d.permission, t)}
                        </span>
                      </div>
                      {canManage ? (
                        <button
                          type="button"
                          className="mail-premium-btn mail-premium-btn--ghost"
                          onClick={() => void handleRemoveDelegate(d.id)}
                        >
                          {t("calActionRemove")}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {canManage ? (
                  <div className="mail-delegation-add">
                    <input
                      type="email"
                      className="mail-posta-input"
                      placeholder={t("exchangeDelegateEmailPlaceholder")}
                      value={delegateEmail}
                      onChange={(e) => setDelegateEmail(e.target.value)}
                    />
                    <select
                      className="mail-posta-select"
                      value={delegatePermission}
                      onChange={(e) =>
                        setDelegatePermission(
                          e.target.value as MailMailboxDelegatePermission,
                        )
                      }
                    >
                      <option value="read">{t("permRead")}</option>
                      <option value="send">{t("permSend")}</option>
                      <option value="manage">{t("permManage")}</option>
                    </select>
                    <button
                      type="button"
                      className="mail-premium-btn"
                      onClick={() => void handleAddDelegate()}
                    >
                      {t("exchangeAddDelegate")}
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">
            {t("exchangeSyncSectionTitle")}
          </h3>
          <p className="mail-posta-card-desc">{t("exchangeSyncSectionDesc")}</p>
        </header>
        {exchange?.configured === false ? (
          <p className="mail-accounts-muted">{t("exchangeGraphEnvHint")}</p>
        ) : (
          <>
            {hub.canManageSenders ? (
              <div className="mail-delegation-mode-actions">
                <button
                  type="button"
                  className="mail-premium-btn"
                  onClick={() => void handleExchangeConnect()}
                >
                  {t("exchangeConnectBtn")}
                </button>
                <button
                  type="button"
                  className="mail-premium-btn mail-premium-btn--ghost"
                  onClick={() => void handleExchangeSyncAll()}
                >
                  {t("settingsSyncAll")}
                </button>
              </div>
            ) : null}
            <ul className="mail-accounts-list--premium">
              {(exchange?.accounts ?? []).map((acc) => (
                <li key={acc.id} className="mail-accounts-card">
                  <div className="mail-accounts-card-main">
                    <span className="mail-accounts-card-email">
                      {acc.emailAddress}
                    </span>
                    <span className="mail-accounts-card-name">
                      {acc.lastSyncedAt
                        ? t("settingsLastSync", {
                            date: formatDateTime(acc.lastSyncedAt),
                          })
                        : t("settingsNotSyncedYet")}
                      {acc.lastSyncError
                        ? t("calErrorSuffix", { error: acc.lastSyncError })
                        : ""}
                    </span>
                  </div>
                  {hub.canManageSenders ? (
                    <div className="mail-accounts-card-actions">
                      <button
                        type="button"
                        className="mail-premium-btn mail-premium-btn--ghost"
                        onClick={() => void handleExchangeSync(acc.id)}
                      >
                        {t("exchangeSyncOne")}
                      </button>
                      <button
                        type="button"
                        className="mail-premium-btn mail-premium-btn--ghost"
                        onClick={() => void handleExchangeDelete(acc.id)}
                      >
                        {t("calActionRemove")}
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {status ? (
        <p className="mail-accounts-status mail-accounts-status--ok" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="mail-accounts-status mail-accounts-status--err" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
