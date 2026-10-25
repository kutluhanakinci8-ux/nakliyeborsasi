"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";
import type { MailConnectedInboxSource } from "@/lib/mailApi";
import { connectedTabLabel } from "@/lib/mailInboxSourceUi";

type Reason = "no_account" | "sync_pending";

type Props = {
  source: MailConnectedInboxSource;
  reason: Reason;
  premium?: boolean;
  onManageAccounts?: () => void;
};

export function MailCapInboxEmptyState({
  source,
  reason,
  premium,
  onManageAccounts,
}: Props) {
  const { t } = useMailLocale();
  const filterLabel = connectedTabLabel(source, t);
  const title =
    reason === "no_account"
      ? t("capEmptyNoAccountTitle")
      : t("capEmptySyncTitle");
  const body =
    reason === "no_account"
      ? t("capEmptyNoAccountBody", { filter: filterLabel })
      : t("capEmptySyncBody", { filter: filterLabel });

  return (
    <div
      className={`mail-empty-state mail-cap-empty${premium ? " mail-empty-state--premium" : ""}`}
      role="status"
    >
      <div className="mail-empty-icon" aria-hidden="true">⇄</div>
      <h2 className="mail-empty-title">{title}</h2>
      <p className="mail-empty-body">{body}</p>
      <p className="mail-empty-links">
        <button
          type="button"
          className="mail-cap-empty-settings-link"
          onClick={() => onManageAccounts?.()}
        >
          {t("capEmptyAccountsLink")}
        </button>
      </p>
    </div>
  );
}
