const POSTA_URL = "https://posta.lerta.com.tr/login";

export type ShareLertaCopy = {
  emailSubject: string;
  emailBody: string;
  smsBody: string;
};

export function buildShareLertaCopy(
  t: (key: string, params?: Record<string, string | number>) => string,
): ShareLertaCopy {
  return {
    emailSubject: t("shareLertaEmailSubject"),
    emailBody: t("shareLertaEmailBody", { url: POSTA_URL }),
    smsBody: t("shareLertaSmsBody", { url: POSTA_URL }),
  };
}

export function shareLertaViaEmail(copy: ShareLertaCopy): void {
  const href = `mailto:?subject=${encodeURIComponent(copy.emailSubject)}&body=${encodeURIComponent(copy.emailBody)}`;
  window.location.href = href;
}

export function shareLertaViaSms(copy: ShareLertaCopy): void {
  const href = `sms:?&body=${encodeURIComponent(copy.smsBody)}`;
  window.location.href = href;
}

export async function shareLertaViaSystem(copy: ShareLertaCopy): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return false;
  }
  try {
    await navigator.share({
      title: copy.emailSubject,
      text: copy.smsBody,
      url: POSTA_URL,
    });
    return true;
  } catch {
    return false;
  }
}
