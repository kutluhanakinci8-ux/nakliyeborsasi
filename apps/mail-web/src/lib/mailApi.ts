import { resolveApiBaseUrl } from "./apiConfig";

export type MailInboxFolder =
  | "inbox"
  | "spam"
  | "all"
  | "archive"
  | "trash"
  | "starred"
  | "snoozed";

export type MailMailboxFolder = "inbox" | "archive" | "trash";

export type MailStorageQuota = {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  utilizationPercent: number;
  nearLimit: boolean;
  atLimit: boolean;
  maxAttachmentBytes: number;
  limitLabelGb: number;
  windowLabelTr: string;
};

export type MailInboxSummary = {
  primaryAddress: string | null;
  mailboxId: string | null;
  unreadCount: number;
  totalMessages: number;
  spamCount: number;
  archiveCount?: number;
  trashCount?: number;
  starredCount?: number;
  snoozedCount?: number;
  storageQuota?: MailStorageQuota;
};

export type MailInboxListItem = {
  id: string;
  fromAddress: string;
  subject: string;
  snippet: string | null;
  receivedAt: string;
  readAt: string | null;
  spamStatus: string;
  spamReason?: string | null;
  attachmentCount?: number;
  starredAt?: string | null;
  customFolderId?: string | null;
};

export type MailInboxRuleConditionGroup = {
  matchAny: boolean;
  fromContains?: string | null;
  subjectContains?: string | null;
  toContains?: string | null;
  requireAttachment?: boolean;
};

export type MailInboxRuleConditionGroups = {
  matchAnyBetweenGroups: boolean;
  groups: MailInboxRuleConditionGroup[];
};

export type MailInboxRule = {
  id: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
  fromContains: string | null;
  subjectContains: string | null;
  toContains: string | null;
  requireAttachment: boolean;
  matchAnyCondition: boolean;
  conditionGroups: MailInboxRuleConditionGroups | null;
  actionStar: boolean;
  actionCustomFolderId: string | null;
  actionArchive: boolean;
  actionMarkRead: boolean;
  actionTrash: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function fetchInboxRules(accessToken: string) {
  return apiFetch<{ rules: MailInboxRule[] }>(
    accessToken,
    "company/mail-inbox/rules",
  );
}

export async function createInboxRule(
  accessToken: string,
  body: {
    name: string;
    fromContains?: string;
    subjectContains?: string;
    toContains?: string;
    requireAttachment?: boolean;
    matchAnyCondition?: boolean;
    conditionGroups?: MailInboxRuleConditionGroups | null;
    actionStar?: boolean;
    actionCustomFolderId?: string | null;
    actionArchive?: boolean;
    actionMarkRead?: boolean;
    actionTrash?: boolean;
    enabled?: boolean;
  },
) {
  return apiFetch<{ rule: MailInboxRule }>(
    accessToken,
    "company/mail-inbox/rules",
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function previewInboxRule(accessToken: string, ruleId: string) {
  return apiFetch<{
    preview: {
      matchCount: number;
      scanned: number;
      capped: boolean;
      matchLogicDescription: string;
      samples: Array<{
        id: string;
        fromAddress: string;
        subject: string;
        matchedBecause: string;
      }>;
    };
  }>(accessToken, `company/mail-inbox/rules/${ruleId}/preview`);
}

export async function applyInboxRuleToMailbox(
  accessToken: string,
  ruleId: string,
) {
  return apiFetch<{ applied: number }>(
    accessToken,
    `company/mail-inbox/rules/${ruleId}/apply-inbox`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function reorderInboxRules(
  accessToken: string,
  ruleIds: string[],
) {
  return apiFetch<{ rules: MailInboxRule[] }>(
    accessToken,
    "company/mail-inbox/rules/reorder",
    { method: "POST", body: JSON.stringify({ ruleIds }) },
  );
}

export async function updateInboxRule(
  accessToken: string,
  ruleId: string,
  body: Partial<{
    name: string;
    fromContains: string | null;
    subjectContains: string | null;
    toContains: string | null;
    requireAttachment: boolean;
    matchAnyCondition: boolean;
    conditionGroups: MailInboxRuleConditionGroups | null;
    actionStar: boolean;
    actionCustomFolderId: string | null;
    actionArchive: boolean;
    actionMarkRead: boolean;
    actionTrash: boolean;
    enabled: boolean;
  }>,
) {
  return apiFetch<{ rule: MailInboxRule }>(
    accessToken,
    `company/mail-inbox/rules/${ruleId}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function deleteInboxRule(accessToken: string, ruleId: string) {
  await apiFetch(accessToken, `company/mail-inbox/rules/${ruleId}`, {
    method: "DELETE",
  });
}

export type MailCustomFolder = {
  id: string;
  name: string;
  sortOrder: number;
  messageCount: number;
  createdAt: string;
};

export type MailInboxMessageDetail = MailInboxListItem & {
  bodyText: string | null;
  bodyHtml: string | null;
  emailAddress: string;
  mailboxFolder?: MailMailboxFolder;
  snoozedUntil?: string | null;
  toRecipients?: string[];
  ccRecipients?: string[];
  attachments: {
    index: number;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }[];
};

export type MailSentItem = {
  id: string;
  toAddress: string;
  subject: string;
  sentAt: string;
};

export type MailSentMessageDetail = MailSentItem & {
  fromAddress: string;
  bodyText: string | null;
  smtpMessageId: string | null;
};

export type MailDraftItem = {
  id: string;
  to: string | null;
  subject: string | null;
  text: string | null;
  attachments: ComposeAttachment[];
  updatedAt: string;
  createdAt: string;
};

export type MailImapSettings = {
  enabled: boolean;
  imapHost: string;
  imapPort: number;
  imapTls: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: "starttls" | "ssl";
  smtpAuthUsesImapPassword: boolean;
  sentFolderImapHint: string;
  username: string | null;
  maildirPath: string | null;
  hasCredential: boolean;
};

export type ComposeAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

export function fileToAttachment(file: File): Promise<ComposeAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        contentBase64: base64,
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function formatApiError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(" ");
    }
    if (typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    /* plain text */
  }
  return raw.length > 200 ? "İşlem başarısız." : raw;
}

async function apiFetch<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${resolveApiBaseUrl()}/${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(formatApiError(text || `API ${path}`));
  }
  return (await response.json()) as T;
}

export async function requestPasswordReset(emailAddress: string): Promise<void> {
  const response = await fetch(
    `${resolveApiBaseUrl()}/auth/request-password-reset`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailAddress: emailAddress.trim() }),
    },
  );
  if (!response.ok) {
    throw new Error("İstek gönderilemedi");
  }
}

export type LoginResponse =
  | { kind: "token"; accessToken: string }
  | { kind: "totp"; challengeToken: string };

export async function login(
  emailAddress: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${resolveApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailAddress, password }),
  });
  if (!response.ok) {
    throw new Error("Giriş başarısız");
  }
  const payload = (await response.json()) as {
    accessToken?: string;
    requiresTotp?: boolean;
    challengeToken?: string;
  };
  if (payload.requiresTotp && payload.challengeToken) {
    return { kind: "totp", challengeToken: payload.challengeToken };
  }
  if (!payload.accessToken) {
    throw new Error("Giriş başarısız");
  }
  return { kind: "token", accessToken: payload.accessToken };
}

export async function completeTotpLogin(
  challengeToken: string,
  code: string,
): Promise<string> {
  const response = await fetch(`${resolveApiBaseUrl()}/auth/login/totp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken, code }),
  });
  if (!response.ok) {
    throw new Error("Doğrulama kodu geçersiz");
  }
  const payload = (await response.json()) as { accessToken: string };
  return payload.accessToken;
}

async function mailApiFetch<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${resolveApiBaseUrl()}/${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
}

export async function fetchTotpStatus(accessToken: string) {
  return mailApiFetch<{
    status: { enabled: boolean; enabledAt: string | null };
  }>(accessToken, "auth/totp/status");
}

export async function beginTotpSetup(accessToken: string) {
  return mailApiFetch<{
    setup: { secret: string; otpauthUrl: string };
  }>(accessToken, "auth/totp/setup", { method: "POST", body: "{}" });
}

export async function confirmTotpSetup(accessToken: string, code: string) {
  return mailApiFetch(accessToken, "auth/totp/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export type MailInboxThreadRow = {
  threadId: string;
  subject: string;
  fromAddress: string;
  snippet: string | null;
  receivedAt: string;
  messageCount: number;
  unreadCount: number;
  latestMessageId: string;
};

export async function fetchInbox(
  accessToken: string,
  folder: MailInboxFolder,
  customFolderId?: string | null,
) {
  const params = new URLSearchParams({ folder });
  if (folder === "inbox" && customFolderId) {
    params.set("customFolderId", customFolderId);
  }
  return apiFetch<{
    summary: MailInboxSummary;
    messages: MailInboxListItem[];
    sent: MailSentItem[];
  }>(accessToken, `company/mail-inbox?${params.toString()}`);
}

export async function fetchCustomFolders(accessToken: string) {
  return apiFetch<{ folders: MailCustomFolder[] }>(
    accessToken,
    "company/mail-inbox/custom-folders",
  );
}

export async function createCustomFolder(accessToken: string, name: string) {
  return apiFetch<{ folder: MailCustomFolder }>(
    accessToken,
    "company/mail-inbox/custom-folders",
    { method: "POST", body: JSON.stringify({ name }) },
  );
}

export async function renameCustomFolder(
  accessToken: string,
  folderId: string,
  name: string,
) {
  return apiFetch<{ folder: MailCustomFolder }>(
    accessToken,
    `company/mail-inbox/custom-folders/${folderId}`,
    { method: "PATCH", body: JSON.stringify({ name }) },
  );
}

export async function deleteCustomFolder(
  accessToken: string,
  folderId: string,
) {
  await apiFetch(accessToken, `company/mail-inbox/custom-folders/${folderId}`, {
    method: "DELETE",
  });
}

export async function bulkSetMessageCustomFolder(
  accessToken: string,
  messageIds: string[],
  customFolderId: string | null,
) {
  return apiFetch<{ updated: number }>(
    accessToken,
    "company/mail-inbox/messages/bulk/custom-folder",
    {
      method: "POST",
      body: JSON.stringify({ messageIds, customFolderId }),
    },
  );
}

export async function fetchInboxThreads(
  accessToken: string,
  folder: MailInboxFolder,
  customFolderId?: string | null,
) {
  const params = new URLSearchParams({ folder });
  if (folder === "inbox" && customFolderId) {
    params.set("customFolderId", customFolderId);
  }
  return apiFetch<{ threads: MailInboxThreadRow[] }>(
    accessToken,
    `company/mail-inbox/threads?${params.toString()}`,
  );
}

export async function fetchThreadMessages(
  accessToken: string,
  threadId: string,
  folder: MailInboxFolder,
  customFolderId?: string | null,
) {
  const params = new URLSearchParams({ folder });
  if (folder === "inbox" && customFolderId) {
    params.set("customFolderId", customFolderId);
  }
  return apiFetch<{ messages: MailInboxListItem[] }>(
    accessToken,
    `company/mail-inbox/threads/${encodeURIComponent(threadId)}/messages?${params.toString()}`,
  );
}

export type MailInboxSearchOptions = {
  q?: string;
  from?: string;
  receivedAfter?: string;
  receivedBefore?: string;
  hasAttachment?: boolean;
};

export async function searchInbox(
  accessToken: string,
  folder: MailInboxFolder,
  options: MailInboxSearchOptions = {},
  customFolderId?: string | null,
) {
  const params = new URLSearchParams({ folder });
  if (folder === "inbox" && customFolderId) {
    params.set("customFolderId", customFolderId);
  }
  const q = options.q?.trim() ?? "";
  if (q) {
    params.set("q", q);
  }
  const from = options.from?.trim() ?? "";
  if (from) {
    params.set("from", from);
  }
  if (options.receivedAfter?.trim()) {
    params.set("receivedAfter", options.receivedAfter.trim());
  }
  if (options.receivedBefore?.trim()) {
    params.set("receivedBefore", options.receivedBefore.trim());
  }
  if (options.hasAttachment === true) {
    params.set("hasAttachment", "true");
  } else if (options.hasAttachment === false) {
    params.set("hasAttachment", "false");
  }
  return apiFetch<{ messages: MailInboxListItem[] }>(
    accessToken,
    `company/mail-inbox/search?${params.toString()}`,
  );
}

export async function fetchSentMessage(accessToken: string, id: string) {
  const payload = await apiFetch<{ message: MailSentMessageDetail }>(
    accessToken,
    `company/mail-inbox/sent/${id}`,
  );
  return payload.message;
}

export async function fetchMessage(accessToken: string, id: string) {
  const payload = await apiFetch<{ message: MailInboxMessageDetail }>(
    accessToken,
    `company/mail-inbox/messages/${id}`,
  );
  return payload.message;
}

export async function downloadMailAttachment(
  accessToken: string,
  messageId: string,
  index: number,
): Promise<Blob> {
  const response = await fetch(
    `${resolveApiBaseUrl()}/company/mail-inbox/messages/${messageId}/attachments/${index}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("Ek indirilemedi");
  }
  return response.blob();
}

export async function markRead(accessToken: string, id: string) {
  await apiFetch(accessToken, `company/mail-inbox/messages/${id}/read`, {
    method: "PATCH",
  });
}

export async function markUnread(accessToken: string, id: string) {
  await apiFetch(accessToken, `company/mail-inbox/messages/${id}/unread`, {
    method: "PATCH",
  });
}

export async function setMessageStarred(
  accessToken: string,
  messageId: string,
  starred: boolean,
) {
  return apiFetch<{ ok: boolean; starredAt: string | null }>(
    accessToken,
    `company/mail-inbox/messages/${messageId}/star`,
    {
      method: "PATCH",
      body: JSON.stringify({ starred }),
    },
  );
}

export async function bulkMarkRead(accessToken: string, messageIds: string[]) {
  return apiFetch<{ updated: number }>(
    accessToken,
    "company/mail-inbox/messages/bulk/read",
    {
      method: "POST",
      body: JSON.stringify({ messageIds }),
    },
  );
}

export async function bulkMarkUnread(accessToken: string, messageIds: string[]) {
  return apiFetch<{ updated: number }>(
    accessToken,
    "company/mail-inbox/messages/bulk/unread",
    {
      method: "POST",
      body: JSON.stringify({ messageIds }),
    },
  );
}

export async function bulkSetMessageMailboxFolder(
  accessToken: string,
  messageIds: string[],
  folder: MailMailboxFolder,
) {
  return apiFetch<{ updated: number }>(
    accessToken,
    "company/mail-inbox/messages/bulk/folder",
    {
      method: "POST",
      body: JSON.stringify({ messageIds, folder }),
    },
  );
}

export async function bulkSetMessageStarred(
  accessToken: string,
  messageIds: string[],
  starred: boolean,
) {
  return apiFetch<{ updated: number }>(
    accessToken,
    "company/mail-inbox/messages/bulk/star",
    {
      method: "POST",
      body: JSON.stringify({ messageIds, starred }),
    },
  );
}

export async function setMessageMailboxFolder(
  accessToken: string,
  messageId: string,
  folder: MailMailboxFolder,
) {
  await apiFetch(accessToken, `company/mail-inbox/messages/${messageId}/folder`, {
    method: "PATCH",
    body: JSON.stringify({ folder }),
  });
}

export async function deleteMessagePermanently(
  accessToken: string,
  messageId: string,
) {
  await apiFetch(accessToken, `company/mail-inbox/messages/${messageId}`, {
    method: "DELETE",
  });
}

export type MailInboxBranding = {
  allowed: boolean;
  planCode: string | null;
  logoUrl: string | null;
  emailBrandTitle: string | null;
  defaultFromDisplayName: string | null;
  hidePlatformEmailChrome: boolean;
  detailTr: string;
};

export type MailPushConfig = {
  enabled: boolean;
  publicKey: string | null;
};

export async function fetchMailPushConfig(accessToken: string) {
  return apiFetch<{ config: MailPushConfig }>(
    accessToken,
    "company/mail-inbox/push-config",
  );
}

export async function registerMailPushSubscription(
  accessToken: string,
  body: { endpoint: string; p256dh: string; auth: string },
) {
  await apiFetch(accessToken, "company/mail-inbox/push/subscribe", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function unregisterMailPushSubscription(
  accessToken: string,
  endpoint: string,
) {
  await apiFetch(accessToken, "company/mail-inbox/push/unsubscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint }),
  });
}

export async function fetchMailInboxBranding(accessToken: string) {
  return apiFetch<{ branding: MailInboxBranding }>(
    accessToken,
    "company/mail-inbox/branding",
  );
}

export type MailDelayedSendResult = {
  ok: true;
  delayed: true;
  pendingId: string;
  sendAt: string;
};

export type ComposeMailResult =
  | { ok: true; sentId: string; smtpMessageId: string | null }
  | MailDelayedSendResult;

export type MailInboxPreferences = {
  dailyDigestEnabled: boolean;
};

export async function fetchInboxPreferences(accessToken: string) {
  return apiFetch<{ preferences: MailInboxPreferences }>(
    accessToken,
    "company/mail-inbox/preferences",
  );
}

export async function updateInboxPreferences(
  accessToken: string,
  body: Partial<MailInboxPreferences>,
) {
  return apiFetch<{ preferences: MailInboxPreferences }>(
    accessToken,
    "company/mail-inbox/preferences",
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function composeMail(
  accessToken: string,
  body: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: ComposeAttachment[];
    delaySeconds?: number;
  },
) {
  return apiFetch<ComposeMailResult>(accessToken, "company/mail-inbox/compose", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function cancelDelayedCompose(
  accessToken: string,
  pendingId: string,
) {
  await apiFetch(accessToken, `company/mail-inbox/compose/pending/${pendingId}/cancel`, {
    method: "POST",
  });
}

export async function snoozeMailMessage(
  accessToken: string,
  messageId: string,
  snoozedUntil: string,
) {
  return apiFetch<{ ok: true; snoozedUntil: string }>(
    accessToken,
    `company/mail-inbox/messages/${messageId}/snooze`,
    { method: "POST", body: JSON.stringify({ snoozedUntil }) },
  );
}

export async function bulkSnoozeMailMessages(
  accessToken: string,
  messageIds: string[],
  snoozedUntil: string,
) {
  return apiFetch<{ updated: number }>(
    accessToken,
    "company/mail-inbox/messages/bulk/snooze",
    {
      method: "POST",
      body: JSON.stringify({ messageIds, snoozedUntil }),
    },
  );
}

export async function unsnoozeMailMessage(accessToken: string, messageId: string) {
  await apiFetch(accessToken, `company/mail-inbox/messages/${messageId}/unsnooze`, {
    method: "POST",
  });
}

export async function replyMail(
  accessToken: string,
  messageId: string,
  body: {
    text: string;
    cc?: string;
    bcc?: string;
    replyAll?: boolean;
    attachments?: ComposeAttachment[];
    delaySeconds?: number;
  },
) {
  return apiFetch<
    { ok: true; sentId: string; smtpMessageId: string | null } | MailDelayedSendResult
  >(accessToken, `company/mail-inbox/messages/${messageId}/reply`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function forwardMail(
  accessToken: string,
  messageId: string,
  body: {
    to: string;
    text?: string;
    includeOriginal?: boolean;
    attachments?: ComposeAttachment[];
    delaySeconds?: number;
  },
) {
  return apiFetch<
    { ok: true; sentId: string; smtpMessageId: string | null } | MailDelayedSendResult
  >(accessToken, `company/mail-inbox/messages/${messageId}/forward`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchDrafts(accessToken: string) {
  const payload = await apiFetch<{ drafts: MailDraftItem[] }>(
    accessToken,
    "company/mail-inbox/drafts",
  );
  return payload.drafts;
}

export async function createDraft(
  accessToken: string,
  body: {
    to?: string;
    subject?: string;
    text?: string;
    attachments?: ComposeAttachment[];
  },
) {
  const payload = await apiFetch<{ draft: MailDraftItem }>(
    accessToken,
    "company/mail-inbox/drafts",
    { method: "POST", body: JSON.stringify(body) },
  );
  return payload.draft;
}

export async function updateDraft(
  accessToken: string,
  draftId: string,
  body: {
    to?: string;
    subject?: string;
    text?: string;
    attachments?: ComposeAttachment[];
  },
) {
  const payload = await apiFetch<{ draft: MailDraftItem }>(
    accessToken,
    `company/mail-inbox/drafts/${draftId}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  return payload.draft;
}

export async function deleteDraft(accessToken: string, draftId: string) {
  await apiFetch(accessToken, `company/mail-inbox/drafts/${draftId}`, {
    method: "DELETE",
  });
}

export async function sendDraft(
  accessToken: string,
  draftId: string,
  options?: { delaySeconds?: number },
) {
  return apiFetch<
    { ok: true; sentId: string; smtpMessageId: string | null } | MailDelayedSendResult
  >(accessToken, `company/mail-inbox/drafts/${draftId}/send`, {
    method: "POST",
    body: JSON.stringify({ delaySeconds: options?.delaySeconds }),
  });
}

export type MailComposePreset = {
  id: string;
  kind: "signature" | "template";
  name: string;
  subject: string | null;
  bodyText: string;
  isDefault: boolean;
  updatedAt: string;
};

export async function fetchComposePresets(accessToken: string) {
  return apiFetch<{
    signatures: MailComposePreset[];
    templates: MailComposePreset[];
  }>(accessToken, "company/mail-inbox/compose-presets");
}

export async function createComposePreset(
  accessToken: string,
  body: {
    kind: "signature" | "template";
    name: string;
    subject?: string;
    bodyText: string;
    isDefault?: boolean;
  },
) {
  const payload = await apiFetch<{ preset: MailComposePreset }>(
    accessToken,
    "company/mail-inbox/compose-presets",
    { method: "POST", body: JSON.stringify(body) },
  );
  return payload.preset;
}

export async function updateComposePreset(
  accessToken: string,
  presetId: string,
  body: {
    name?: string;
    subject?: string;
    bodyText?: string;
    isDefault?: boolean;
  },
) {
  const payload = await apiFetch<{ preset: MailComposePreset }>(
    accessToken,
    `company/mail-inbox/compose-presets/${presetId}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  return payload.preset;
}

export async function deleteComposePreset(
  accessToken: string,
  presetId: string,
) {
  await apiFetch(accessToken, `company/mail-inbox/compose-presets/${presetId}`, {
    method: "DELETE",
  });
}

export type MailCalendarIcsFeed = {
  id: string;
  label: string;
  feedUrl: string;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchCalendarIcsFeeds(accessToken: string) {
  return apiFetch<{ feeds: MailCalendarIcsFeed[] }>(
    accessToken,
    "company/mail-inbox/calendar/feeds",
  );
}

export async function createCalendarIcsFeed(
  accessToken: string,
  body: { label: string; feedUrl: string; enabled?: boolean },
) {
  return apiFetch<{ feed: MailCalendarIcsFeed }>(
    accessToken,
    "company/mail-inbox/calendar/feeds",
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function deleteCalendarIcsFeed(
  accessToken: string,
  feedId: string,
) {
  await apiFetch(accessToken, `company/mail-inbox/calendar/feeds/${feedId}`, {
    method: "DELETE",
  });
}

export async function syncCalendarIcsFeed(
  accessToken: string,
  feedId: string,
) {
  return apiFetch<{
    imported: number;
    updated: number;
    removed: number;
  }>(accessToken, `company/mail-inbox/calendar/feeds/${feedId}/sync`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type MailCalendarCalDavAccount = {
  id: string;
  label: string;
  calendarUrl: string;
  username: string;
  enabled: boolean;
  writeEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchCalendarCalDavAccounts(accessToken: string) {
  return apiFetch<{ accounts: MailCalendarCalDavAccount[] }>(
    accessToken,
    "company/mail-inbox/calendar/caldav/accounts",
  );
}

export async function createCalendarCalDavAccount(
  accessToken: string,
  body: {
    label: string;
    calendarUrl: string;
    username: string;
    password: string;
    enabled?: boolean;
    writeEnabled?: boolean;
  },
) {
  return apiFetch<{ account: MailCalendarCalDavAccount }>(
    accessToken,
    "company/mail-inbox/calendar/caldav/accounts",
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function deleteCalendarCalDavAccount(
  accessToken: string,
  accountId: string,
) {
  await apiFetch(
    accessToken,
    `company/mail-inbox/calendar/caldav/accounts/${accountId}`,
    { method: "DELETE" },
  );
}

export async function syncCalendarCalDavAccount(
  accessToken: string,
  accountId: string,
) {
  return apiFetch<{
    imported: number;
    updated: number;
    removed: number;
  }>(
    accessToken,
    `company/mail-inbox/calendar/caldav/accounts/${accountId}/sync`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function syncAllCalendarCalDavAccounts(accessToken: string) {
  return apiFetch<{
    accounts: number;
    succeeded: number;
    failed: number;
    imported: number;
    updated: number;
    removed: number;
  }>(accessToken, "company/mail-inbox/calendar/caldav/accounts/sync-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function pushCalendarEventToCalDav(
  accessToken: string,
  accountId: string,
  eventId: string,
) {
  return apiFetch<{ resourceHref: string; externalUid: string }>(
    accessToken,
    `company/mail-inbox/calendar/caldav/accounts/${accountId}/push/${eventId}`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function pushCalendarOccurrenceToCalDav(
  accessToken: string,
  accountId: string,
  eventId: string,
  occurrenceStartsAt: string,
) {
  return apiFetch<{ resourceHref: string; externalUid: string }>(
    accessToken,
    `company/mail-inbox/calendar/caldav/accounts/${accountId}/push/${eventId}/occurrence`,
    {
      method: "POST",
      body: JSON.stringify({ occurrenceStartsAt }),
    },
  );
}

export async function syncAllCalendarIcsFeeds(accessToken: string) {
  return apiFetch<{
    feeds: number;
    succeeded: number;
    failed: number;
    imported: number;
    updated: number;
    removed: number;
  }>(accessToken, "company/mail-inbox/calendar/feeds/sync-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type MailCalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  recurrenceRule: string | null;
  recurrenceUntil: string | null;
  isRecurrenceOccurrence: boolean;
  isOccurrenceOverride: boolean;
  occurrenceAnchorAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MailOrgContact = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchCalendarEvents(
  accessToken: string,
  from: string,
  to: string,
) {
  const q = new URLSearchParams({ from, to });
  return apiFetch<{ events: MailCalendarEvent[] }>(
    accessToken,
    `company/mail-inbox/calendar/events?${q}`,
  );
}

export async function createCalendarEvent(
  accessToken: string,
  body: {
    title: string;
    description?: string;
    location?: string;
    startsAt: string;
    endsAt: string;
    allDay?: boolean;
    recurrenceFrequency?: "daily" | "weekly" | "monthly";
    recurrenceUntil?: string;
  },
) {
  return apiFetch<{ event: MailCalendarEvent }>(
    accessToken,
    "company/mail-inbox/calendar/events",
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function patchCalendarOccurrence(
  accessToken: string,
  eventId: string,
  body: {
    occurrenceStartsAt: string;
    title?: string;
    startsAt?: string;
    endsAt?: string;
    allDay?: boolean;
  },
) {
  return apiFetch<{ ok: true; event: MailCalendarEvent }>(
    accessToken,
    `company/mail-inbox/calendar/events/${eventId}/occurrence`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
  occurrenceStartsAt?: string,
) {
  const q = occurrenceStartsAt
    ? `?occurrenceStartsAt=${encodeURIComponent(occurrenceStartsAt)}`
    : "";
  await apiFetch(
    accessToken,
    `company/mail-inbox/calendar/events/${eventId}${q}`,
    {
      method: "DELETE",
    },
  );
}

export async function importCalendarIcs(accessToken: string, ics: string) {
  return apiFetch<{ imported: number; skipped: number }>(
    accessToken,
    "company/mail-inbox/calendar/import",
    { method: "POST", body: JSON.stringify({ ics }) },
  );
}

export async function downloadCalendarIcs(
  accessToken: string,
  from: string,
  to: string,
): Promise<Blob> {
  const q = new URLSearchParams({ from, to });
  const response = await fetch(
    `${resolveApiBaseUrl()}/company/mail-inbox/calendar/export.ics?${q}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(formatApiError(text));
  }
  return response.blob();
}

export async function fetchOrgContacts(accessToken: string) {
  return apiFetch<{ contacts: MailOrgContact[] }>(
    accessToken,
    "company/mail-inbox/contacts",
  );
}

export async function createOrgContact(
  accessToken: string,
  body: {
    displayName: string;
    email?: string;
    phone?: string;
    notes?: string;
  },
) {
  return apiFetch<{ contact: MailOrgContact }>(
    accessToken,
    "company/mail-inbox/contacts",
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function deleteOrgContact(accessToken: string, contactId: string) {
  await apiFetch(accessToken, `company/mail-inbox/contacts/${contactId}`, {
    method: "DELETE",
  });
}

export async function importContactsVcf(accessToken: string, vcf: string) {
  return apiFetch<{ imported: number; skipped: number }>(
    accessToken,
    "company/mail-inbox/contacts/import",
    { method: "POST", body: JSON.stringify({ vcf }) },
  );
}

export async function downloadContactsVcf(accessToken: string): Promise<Blob> {
  const response = await fetch(
    `${resolveApiBaseUrl()}/company/mail-inbox/contacts/export.vcf`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(formatApiError(text));
  }
  return response.blob();
}

export type MailContactCardDavAccount = {
  id: string;
  label: string;
  addressbookUrl: string;
  username: string;
  enabled: boolean;
  writeEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchContactCardDavAccounts(accessToken: string) {
  return apiFetch<{ accounts: MailContactCardDavAccount[] }>(
    accessToken,
    "company/mail-inbox/contacts/carddav/accounts",
  );
}

export async function createContactCardDavAccount(
  accessToken: string,
  body: {
    label: string;
    addressbookUrl: string;
    username: string;
    password: string;
    enabled?: boolean;
    writeEnabled?: boolean;
  },
) {
  return apiFetch<{ account: MailContactCardDavAccount }>(
    accessToken,
    "company/mail-inbox/contacts/carddav/accounts",
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function deleteContactCardDavAccount(
  accessToken: string,
  accountId: string,
) {
  await apiFetch(
    accessToken,
    `company/mail-inbox/contacts/carddav/accounts/${accountId}`,
    { method: "DELETE" },
  );
}

export async function syncContactCardDavAccount(
  accessToken: string,
  accountId: string,
) {
  return apiFetch<{
    imported: number;
    updated: number;
    removed: number;
  }>(
    accessToken,
    `company/mail-inbox/contacts/carddav/accounts/${accountId}/sync`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function syncAllContactCardDavAccounts(accessToken: string) {
  return apiFetch<{
    accounts: number;
    succeeded: number;
    failed: number;
    imported: number;
    updated: number;
    removed: number;
  }>(accessToken, "company/mail-inbox/contacts/carddav/accounts/sync-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function pushContactToCardDav(
  accessToken: string,
  accountId: string,
  contactId: string,
) {
  return apiFetch<{ resourceHref: string; externalUid: string }>(
    accessToken,
    `company/mail-inbox/contacts/carddav/accounts/${accountId}/push/${contactId}`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function fetchImapSettings(accessToken: string) {
  const payload = await apiFetch<{ settings: MailImapSettings }>(
    accessToken,
    "company/mail-inbox/imap-settings",
  );
  return payload.settings;
}

export async function rotateImapPassword(accessToken: string) {
  const payload = await apiFetch<{
    credentials: { username: string; password: string };
  }>(accessToken, "company/mail-inbox/imap-credentials/rotate", {
    method: "POST",
    body: JSON.stringify({}),
  });
  return payload.credentials;
}
