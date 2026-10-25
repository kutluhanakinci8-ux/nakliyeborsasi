"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";
import {
  getMailEmptyStateContent,
  type MailEmptyVariant,
} from "@/lib/mailWebLocale";

type Variant = MailEmptyVariant;

export function MailEmptyState({
  variant,
  premium,
}: {
  variant: Variant;
  premium?: boolean;
}) {
  const { t } = useMailLocale();
  const content = getMailEmptyStateContent(t, variant);
  return (
    <div
      className={`mail-empty-state${premium ? " mail-empty-state--premium" : ""}`}
      role="status"
    >
      <div className="mail-empty-icon" aria-hidden="true">
        {premium ? "✉" : "@"}
      </div>
      <h2 className="mail-empty-title">{content.title}</h2>
      <p className="mail-empty-body">{content.body}</p>
      {content.tips?.length ? (
        <ul className="mail-empty-tips">
          {content.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      ) : null}
      <p className="mail-empty-links">
        <a
          href="https://app.lerta.com.tr/hesap/organizasyon#org-eposta"
          target="_blank"
          rel="noreferrer"
        >
          {t("emptyLinkIdentity")}
        </a>
        {" · "}
        <a
          href="https://www.lerta.com.tr/sss"
          target="_blank"
          rel="noreferrer"
        >
          {t("emptyLinkFaq")}
        </a>
      </p>
    </div>
  );
}
