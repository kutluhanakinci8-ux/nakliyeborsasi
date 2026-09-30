import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { MessagingApiClient } from "./MessagingApiClient";

export async function navigateToPlatformSupportChat(params: {
  accessToken: string;
  locale: string;
  router: AppRouterInstance;
  suggestedDraft?: string;
}): Promise<void> {
  const { supportCompanyId } = await MessagingApiClient.fetchPlatformSupport(
    params.accessToken,
  );
  const search = new URLSearchParams({
    tab: "sohbet",
    companyId: supportCompanyId,
    support: "verification",
  });
  if (params.suggestedDraft?.trim()) {
    search.set("draft", params.suggestedDraft.trim().slice(0, 500));
  }
  params.router.push(`/messaging?${search.toString()}`);
}
