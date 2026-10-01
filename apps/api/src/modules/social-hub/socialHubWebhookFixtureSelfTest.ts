import { SocialHubMockProvider } from "./SocialHubMockProvider";

export function runSocialHubWebhookFixtureSelfTest(): void {
  SocialHubMockProvider.runWebhookContractSelfTest();
}
