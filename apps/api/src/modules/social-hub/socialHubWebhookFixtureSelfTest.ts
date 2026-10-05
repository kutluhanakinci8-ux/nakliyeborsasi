import { SocialHubMockProvider } from "./SocialHubMockProvider";
import {
  formatTelegramApiFailureMessage,
  isTelegramFloodError,
} from "./oauth/socialHubTelegramFlood";

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
}
