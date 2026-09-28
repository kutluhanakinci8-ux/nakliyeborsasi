export type MessagingVapidResolution = {
  subject: string;
  publicKey: string;
  privateKey: string;
  /** messaging anahtarları kullanılıyor (mail fallback değil) */
  isolated: boolean;
};

/**
 * Sohbet push: varsayılan yalnızca MESSAGING_WEB_PUSH_VAPID_*.
 * Geçiş: MESSAGING_WEB_PUSH_ALLOW_MAIL_FALLBACK=true ile mail anahtarlarına düşer.
 */
export function resolveMessagingVapidFromEnv(): MessagingVapidResolution | null {
  const mPub = process.env.MESSAGING_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";
  const mPriv = process.env.MESSAGING_WEB_PUSH_VAPID_PRIVATE_KEY?.trim() ?? "";
  const mSub =
    process.env.MESSAGING_WEB_PUSH_VAPID_SUBJECT?.trim() ??
    "mailto:notifications@mail.lerta.com.tr";

  if (mPub && mPriv) {
    return {
      subject: mSub,
      publicKey: mPub,
      privateKey: mPriv,
      isolated: true,
    };
  }

  const allowFallback =
    process.env.MESSAGING_WEB_PUSH_ALLOW_MAIL_FALLBACK?.trim() === "true";
  if (!allowFallback) {
    return null;
  }

  const mailPub = process.env.MAIL_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";
  const mailPriv = process.env.MAIL_WEB_PUSH_VAPID_PRIVATE_KEY?.trim() ?? "";
  const mailSub =
    process.env.MAIL_WEB_PUSH_VAPID_SUBJECT?.trim() ??
    "mailto:admin@lerta.tr";
  if (!mailPub || !mailPriv) {
    return null;
  }
  return {
    subject: mailSub,
    publicKey: mailPub,
    privateKey: mailPriv,
    isolated: false,
  };
}
