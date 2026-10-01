const DEFAULT_COOLDOWN_MINUTES = 15;

export function socialHubManualNotifyCooldownMinutes(): number {
  const raw = process.env.SOCIAL_HUB_MANUAL_NOTIFY_COOLDOWN_MINUTES?.trim();
  if (raw === "0") {
    return 0;
  }
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_COOLDOWN_MINUTES;
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_COOLDOWN_MINUTES;
  }
  return parsed;
}

export function socialHubManualNotifyCooldownMs(): number {
  return socialHubManualNotifyCooldownMinutes() * 60 * 1000;
}

export function manualNotifyCooldownMessage(
  lastSentAt: Date | null | undefined,
  actionLabel: string,
): string | null {
  const cooldownMs = socialHubManualNotifyCooldownMs();
  if (cooldownMs <= 0) {
    return null;
  }
  const last = lastSentAt?.getTime() ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed >= cooldownMs) {
    return null;
  }
  const waitMinutes = Math.max(1, Math.ceil((cooldownMs - elapsed) / 60_000));
  return `${actionLabel} için yaklaşık ${waitMinutes} dakika bekleyin (manuel gönderim sınırı).`;
}
