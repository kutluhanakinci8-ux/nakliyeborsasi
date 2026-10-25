"use client";

import { useEffect, useState } from "react";
import { fetchMailBillingPlatformStatus } from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import {
  dismissPilotBillingNotice,
  isPilotBillingNoticeDismissed,
  shouldShowPilotBillingNotice,
} from "@/lib/mailPilotBilling";
import { MAIL_CONSOLE_UPGRADE } from "@/lib/postaOnboardingUrls";

type Props = {
  accessToken: string;
  variant: "banner" | "hub";
};

export function MailPilotBillingNotice({ accessToken, variant }: Props) {
  const { t } = useMailLocale();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPilotBillingNoticeDismissed() && variant === "banner") {
      setVisible(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { status } = await fetchMailBillingPlatformStatus(accessToken);
        if (!cancelled) {
          setVisible(shouldShowPilotBillingNotice(status));
        }
      } catch {
        if (!cancelled) {
          setVisible(shouldShowPilotBillingNotice(null));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, variant]);

  if (loading || !visible) {
    return null;
  }

  const className =
    variant === "banner"
      ? "mail-pilot-billing-banner"
      : "mail-pilot-billing-notice";

  return (
    <div className={className} role="note">
      <p className="mail-pilot-billing-title">{t("pilotBillingTitle")}</p>
      <p className="mail-pilot-billing-body">{t("pilotBillingBody")}</p>
      <div className="mail-pilot-billing-actions">
        <a
          className="mail-pilot-billing-link"
          href={MAIL_CONSOLE_UPGRADE}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("pilotBillingConsoleLink")}
        </a>
        {variant === "banner" ? (
          <button
            type="button"
            className="mail-pilot-billing-dismiss"
            onClick={() => {
              dismissPilotBillingNotice();
              setVisible(false);
            }}
          >
            {t("pilotBillingDismiss")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
