import type { MailWebEmbedHandoff } from "./mailWebEmbedDeepLink";

/** Tam webmail (posta.lerta.com.tr) — logistics uygulamasından SSO linki. */
export function resolveMailWebPublicUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_MAIL_WEB_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "https://posta.lerta.com.tr";
}

export function buildMailWebSsoHandoffUrl(
  accessToken: string,
  options?: { embed?: boolean } & MailWebEmbedHandoff,
): string {
  const base = resolveMailWebPublicUrl();
  const params = new URLSearchParams();
  if (options?.embed) {
    params.set("embed", "1");
  }
  if (options?.embedHubShell) {
    params.set("embedHub", "1");
  }
  if (options?.productShell === "ekolojik") {
    params.set("shellBrand", "ekolojik");
  }
  const composeTo = options?.composeTo?.trim();
  if (composeTo) {
    params.set("composeTo", composeTo);
  }
  if (options?.openCompose) {
    params.set("compose", "1");
  }
  if (options?.composeRich === true) {
    params.set("composeRich", "1");
  } else if (options?.composeRich === false) {
    params.set("composeRich", "0");
  }
  const composeTemplateId = options?.composeTemplateId?.trim();
  if (composeTemplateId) {
    params.set("composeTemplate", composeTemplateId);
  }
  if (options?.composeMultipart) {
    params.set("composeMultipart", "1");
  }
  if (options?.composeAiAssist) {
    params.set("composeAi", "1");
  }
  const mailSettingsTab = options?.mailSettingsTab?.trim();
  if (mailSettingsTab) {
    params.set("mailSettings", mailSettingsTab);
  }
  if (options?.mailBulkAssist) {
    params.set("mailBulk", "1");
  }
  if (options?.mailSwipeAssist) {
    params.set("mailSwipe", "1");
  }
  if (options?.mailDmarcAssist) {
    params.set("mailDmarc", "1");
  }
  if (options?.mailPwaAssist) {
    params.set("mailPwa", "1");
  }
  if (options?.mailEngagementAssist) {
    params.set("mailEngagement", "1");
  }
  if (options?.mailOpsAssist) {
    params.set("mailOps", "1");
  }
  if (options?.mailView) {
    params.set("mailView", options.mailView);
  }
  if (options?.customFolder?.trim()) {
    params.set("customFolder", options.customFolder.trim());
  }
  const messageId = options?.messageId?.trim();
  if (messageId) {
    params.set("message", messageId);
  }
  const qs = params.toString();
  return `${base}/auth/consume${qs ? `?${qs}` : ""}#access_token=${encodeURIComponent(accessToken)}`;
}
