export type BounceClass =
  | "hard"
  | "soft"
  | "mailbox_full"
  | "auth"
  | "spam"
  | "unknown";

export type ClassifiedDeliveryFailure = {
  bounceClass: BounceClass;
  smtpCode: string | null;
};

export function classifySmtpDeliveryFailure(
  message: string | null | undefined,
): ClassifiedDeliveryFailure {
  if (!message?.trim()) {
    return { bounceClass: "unknown", smtpCode: null };
  }
  const text = message.toLowerCase();
  const codeMatch = message.match(/\b([45]\d{2})\b/);
  const smtpCode = codeMatch?.[1] ?? null;

  if (
    text.includes("spam") ||
    text.includes("blocked") ||
    text.includes("blacklist") ||
    text.includes("denied")
  ) {
    return { bounceClass: "spam", smtpCode };
  }
  if (
    text.includes("authentication") ||
    text.includes("auth") ||
    text.includes("credentials") ||
    text.includes("535")
  ) {
    return { bounceClass: "auth", smtpCode };
  }
  if (
    text.includes("mailbox full") ||
    text.includes("over quota") ||
    text.includes("452")
  ) {
    return { bounceClass: "mailbox_full", smtpCode };
  }
  if (
    smtpCode?.startsWith("5") ||
    text.includes("user unknown") ||
    text.includes("does not exist") ||
    text.includes("550") ||
    text.includes("551") ||
    text.includes("553")
  ) {
    return { bounceClass: "hard", smtpCode };
  }
  if (
    smtpCode?.startsWith("4") ||
    text.includes("try again") ||
    text.includes("temporar") ||
    text.includes("421") ||
    text.includes("450") ||
    text.includes("451")
  ) {
    return { bounceClass: "soft", smtpCode };
  }
  return { bounceClass: "unknown", smtpCode: null };
}

/** Faz A: kalıcı teslimat hatalarında alıcıyı suppression listesine al. */
export function shouldAutoSuppressForBounceClass(
  bounceClass: BounceClass,
): boolean {
  return bounceClass === "hard" || bounceClass === "spam";
}
