"use client";

import { useEffect, useState } from "react";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import {
  dismissIosPwaBanner,
  isIosPwaBannerDismissed,
  isIosSafari,
  isStandaloneMailPwa,
} from "@/lib/mailIosPwa";

export function MailIosPwaOnboardingBanner() {
  const { t } = useMailLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosSafari() || isStandaloneMailPwa() || isIosPwaBannerDismissed()) {
      return;
    }
    setVisible(true);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="mail-ios-pwa-banner" role="note">
      <div className="mail-ios-pwa-banner-text">
        <p className="mail-ios-pwa-banner-title">{t("iosPwaBannerTitle")}</p>
        <ol className="mail-ios-pwa-banner-steps">
          <li>{t("iosPwaStep1")}</li>
          <li>{t("iosPwaStep2")}</li>
          <li>{t("iosPwaStep3")}</li>
        </ol>
      </div>
      <button
        type="button"
        className="mail-ios-pwa-banner-dismiss"
        onClick={() => {
          dismissIosPwaBanner();
          setVisible(false);
        }}
      >
        {t("iosPwaDismiss")}
      </button>
    </div>
  );
}
