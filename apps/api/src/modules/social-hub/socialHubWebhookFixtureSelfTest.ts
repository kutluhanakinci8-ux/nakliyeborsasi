import { SocialHubMockProvider } from "./SocialHubMockProvider";
import {
  formatTelegramApiFailureMessage,
  isTelegramFloodError,
} from "./oauth/socialHubTelegramFlood";
import { SOCIAL_HUB_TELEGRAM_WEBHOOK_ALLOWED_UPDATES } from "./oauth/socialHubTelegramWebhookConfig";

export function runSocialHubWebhookFixtureSelfTest(): void {
  SocialHubMockProvider.runWebhookContractSelfTest();
  if (
    !isTelegramFloodError({
      ok: false,
      error_code: 429,
      description: "Too Many Requests",
    })
  ) {
    throw new Error("Telegram flood helper self-test failed");
  }
  const floodMsg = formatTelegramApiFailureMessage(
    {
      ok: false,
      error_code: 429,
      parameters: { retry_after: 4 },
    },
    "fallback",
  );
  if (!floodMsg.includes("4")) {
    throw new Error(`Telegram flood message self-test: ${floodMsg}`);
  }
  if (!SOCIAL_HUB_TELEGRAM_WEBHOOK_ALLOWED_UPDATES.includes("deleted_message")) {
    throw new Error("Telegram webhook allowed_updates missing deleted_message");
  }
}
