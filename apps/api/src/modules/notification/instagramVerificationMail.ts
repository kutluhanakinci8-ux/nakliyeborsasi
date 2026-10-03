/** Instagram / Meta profile verification emails (ig_verification_code). */
export function extractInstagramVerificationCode(input: {
  fromAddress: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
}): string | null {
  const from = input.fromAddress.toLowerCase();
  const subject = input.subject.trim();
  const looksLikeIgVerify =
    from.includes("mail.instagram.com") ||
    from.includes("facebookmail.com") ||
    /verify your profile/i.test(subject) ||
    /profilinizi doğrula/i.test(subject);

  if (!looksLikeIgVerify) {
    return null;
  }

  const plain = [
    input.bodyText ?? "",
    input.bodyHtml?.replace(/<[^>]+>/g, " ") ?? "",
  ]
    .join("\n")
    .replace(/=\r?\n/g, "")
    .replace(/\s+/g, " ");

  const afterConfirm = plain.match(
    /confirm your identity:?\s*(\d{6,8})/i,
  );
  if (afterConfirm?.[1]) {
    return afterConfirm[1];
  }

  const kimliginizi = plain.match(
    /kimliğinizi doğrulamak için.*?\s(\d{6,8})\b/is,
  );
  if (kimliginizi?.[1]) {
    return kimliginizi[1];
  }

  const candidates = plain.match(/\b\d{6}\b/g);
  if (!candidates?.length) {
    return null;
  }
  return candidates[0];
}
