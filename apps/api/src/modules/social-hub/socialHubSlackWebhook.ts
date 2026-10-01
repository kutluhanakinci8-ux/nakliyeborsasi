import { ValidationException } from "@nakliyeborsasi/core";

const SLACK_HOOK_PREFIX = /^https:\/\/hooks\.slack\.com\//i;

export function normalizeSocialHubSlackWebhookUrl(
  raw: string | null | undefined,
): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  if (!SLACK_HOOK_PREFIX.test(trimmed)) {
    throw new ValidationException(
      "Slack webhook adresi https://hooks.slack.com/ ile başlamalı.",
    );
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      throw new ValidationException("Slack webhook yalnızca HTTPS olabilir.");
    }
  } catch {
    throw new ValidationException("Slack webhook URL geçersiz.");
  }
  return trimmed.slice(0, 512);
}
