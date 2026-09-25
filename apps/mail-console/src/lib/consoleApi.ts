import { resolveApiBaseUrl } from "./apiConfig";

export type CustomDomainBundle = {
  mailDomain: {
    id: string;
    domain: string;
    verificationStatus: string;
  } | null;
  dnsInstructions: {
    domain: string;
    mxHost?: string;
    mxPriority?: number;
    spfHost: string;
    spfValue: string;
    dkimHost: string;
    dkimTxt: string;
    dmarcHost: string;
    dmarcValue: string;
  } | null;
  dnsCheck: {
    ok: boolean;
    mx?: { ok: boolean; detail: string };
    spf: { ok: boolean; detail: string };
    dkim: { ok: boolean; detail: string };
  } | null;
  fromAddress: string | null;
};

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
    throw new Error(text || `API ${path}`);
  }
  return (await response.json()) as T;
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

export async function completeTotpLogin(challengeToken: string, code: string) {
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

export async function fetchTotpStatus(accessToken: string) {
  return apiFetch<{
    status: {
      enabled: boolean;
      enabledAt: string | null;
      pendingSetup: boolean;
    };
  }>(accessToken, "auth/totp/status");
}

export async function beginTotpSetup(accessToken: string) {
  return apiFetch<{
    setup: { secret: string; otpauthUrl: string; issuer: string };
  }>(accessToken, "auth/totp/setup", { method: "POST", body: "{}" });
}

export async function confirmTotpSetup(accessToken: string, code: string) {
  return apiFetch(accessToken, "auth/totp/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function disableTotp(
  accessToken: string,
  password: string,
  code: string,
) {
  return apiFetch(accessToken, "auth/totp/disable", {
    method: "POST",
    body: JSON.stringify({ password, code }),
  });
}

export async function fetchMailSecurityPolicy(accessToken: string) {
  return apiFetch<{
    policy: { requireTotpForConsole: boolean };
    totp: {
      enabled: boolean;
      enabledAt: string | null;
      pendingSetup: boolean;
    };
    permissions: { canManagePolicy: boolean };
  }>(accessToken, "company/mail-identity/security");
}

export async function updateMailSecurityPolicy(
  accessToken: string,
  requireTotpForConsole: boolean,
) {
  return apiFetch<{ policy: { requireTotpForConsole: boolean } }>(
    accessToken,
    "company/mail-identity/security",
    {
      method: "PATCH",
      body: JSON.stringify({ requireTotpForConsole }),
    },
  );
}

export async function registerMailSaas(params: {
  emailAddress: string;
  password: string;
  displayName: string;
  companyLegalName: string;
  subscriptionPlanCode?: string;
}) {
  const response = await fetch(`${resolveApiBaseUrl()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emailAddress: params.emailAddress,
      password: params.password,
      displayName: params.displayName,
      companyLegalName: params.companyLegalName,
      companyCountryCode: "TR",
      companyParticipantTypeCode: "LOAD_SHIPPER",
      subscriptionPlanCode:
        params.subscriptionPlanCode ?? "lerta_mail_pilot_tr",
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Kayıt başarısız");
  }
  const payload = (await response.json()) as { accessToken: string };
  return payload.accessToken;
}

export async function fetchCustomDomainBundle(accessToken: string) {
  const data = await apiFetch<{ bundle: CustomDomainBundle }>(
    accessToken,
    "company/mail-identity/custom-domain",
  );
  return data.bundle;
}

export async function registerCustomDomain(accessToken: string, domain: string) {
  const data = await apiFetch<{ bundle: CustomDomainBundle }>(
    accessToken,
    "company/mail-identity/custom-domain",
    {
      method: "POST",
      body: JSON.stringify({ domain }),
    },
  );
  return data.bundle;
}

export async function verifyCustomDomainDns(accessToken: string) {
  return apiFetch<{ domain: { verificationStatus: string } }>(
    accessToken,
    "company/mail-identity/custom-domain/verify-dns",
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function fetchMailSenders(accessToken: string) {
  return apiFetch<{
    senders: {
      id: string;
      mailboxId: string | null;
      localPart: string;
      displayName: string | null;
      isDefault: boolean;
      domain: string;
      fromAddress: string;
    }[];
    mailboxQuota: { used: number; limit: number };
  }>(accessToken, "company/mail-identity/senders");
}

export async function setDefaultMailSender(
  accessToken: string,
  senderId: string,
) {
  return apiFetch<{ senders: unknown[] }>(
    accessToken,
    `company/mail-identity/senders/${senderId}/default`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function quickStartPilotMailbox(
  accessToken: string,
  params: {
    companyLegalName: string;
    displayName?: string;
    localPart?: string;
  },
) {
  return apiFetch<{
    fromAddress: string;
    localPart: string;
    tenantDomain: string;
    webmailHandoffPath: string;
  }>(accessToken, "company/mail-identity/pilot/quick-start", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function requestPasswordReset(emailAddress: string) {
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

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const response = await fetch(`${resolveApiBaseUrl()}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword: newPassword }),
  });
  if (!response.ok) {
    throw new Error("Şifre güncellenemedi");
  }
}

export async function provisionTenantMailbox(
  accessToken: string,
  localPart: string,
  options?: { displayName?: string; makeDefault?: boolean },
) {
  return apiFetch<{ fromAddress: string }>(
    accessToken,
    "company/mail-identity/provision",
    {
      method: "POST",
      body: JSON.stringify({
        localPart,
        displayName: options?.displayName,
        makeDefault: options?.makeDefault,
      }),
    },
  );
}

export async function operatorVerifyDomainDns(
  accessToken: string,
  domainId: string,
) {
  return apiFetch<{ dnsCheck: CustomDomainBundle["dnsCheck"] }>(
    accessToken,
    `platform-admin/mail/domains/${domainId}/verify-dns`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function provisionCustomMailbox(
  accessToken: string,
  localPart: string,
  options?: { displayName?: string; makeDefault?: boolean },
) {
  return apiFetch<{ fromAddress: string }>(
    accessToken,
    "company/mail-identity/custom-domain/provision",
    {
      method: "POST",
      body: JSON.stringify({
        localPart,
        displayName: options?.displayName,
        makeDefault: options?.makeDefault,
      }),
    },
  );
}

export type MailOperatorTenantRow = {
  organizationId: string;
  companyLegalName: string;
  planCode: string | null;
  billingStatus: string | null;
  mailboxCount: number;
  senderCount: number;
  customDomain: string | null;
  domainVerified: boolean;
  suspended: boolean;
  abuseFlag: boolean;
  suspendReason: string | null;
  operatorNote: string | null;
  suspendedAt: string | null;
};

export async function fetchOperatorTenants(accessToken: string) {
  return apiFetch<{ tenants: MailOperatorTenantRow[] }>(
    accessToken,
    "platform-admin/mail/tenants",
  );
}

export async function operatorSuspendTenant(
  accessToken: string,
  organizationId: string,
  reason: string,
) {
  return apiFetch<{ tenant: MailOperatorTenantRow }>(
    accessToken,
    `platform-admin/mail/tenants/${organizationId}/suspend`,
    {
      method: "POST",
      body: JSON.stringify({ reason, abuseFlag: true }),
    },
  );
}

export async function operatorUnsuspendTenant(
  accessToken: string,
  organizationId: string,
) {
  return apiFetch<{ tenant: MailOperatorTenantRow }>(
    accessToken,
    `platform-admin/mail/tenants/${organizationId}/unsuspend`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function fetchOperatorDomains(accessToken: string) {
  return apiFetch<{ domains: unknown[] }>(
    accessToken,
    "platform-admin/mail/domains",
  );
}

export type MailPlatformMonitoring = {
  collectedAt: string;
  overallStatus: "ok" | "warning" | "critical" | "unknown";
  api: { status: string; uptimeSeconds: number };
  outbox: {
    status: string;
    pending: number;
    failed: number;
    detailTr: string;
    lastDrainAt: string | null;
    lastDrainError: string | null;
  };
  smtp: { status: string; detailTr: string };
  postfixQueue: { status: string; messageCount: number | null; detailTr: string };
  disk: {
    status: string;
    mounts: { path: string; usedPercent: number; freeGb: number }[];
    detailTr: string;
  };
  tlsCertificates: {
    status: string;
    certs: { path: string; daysRemaining: number; expiresAt: string }[];
    detailTr: string;
  };
  runtimeRole?: {
    role: "all" | "api" | "worker";
    backgroundJobsEnabled: boolean;
    detailTr: string;
  };
};

export type MailPlatformKpi = {
  collectedAt: string;
  summaryTr: string;
  tenants: {
    total: number;
    suspended: number;
    withVerifiedCustomDomain: number;
    onPaidMailPlan: number;
    activeOutboundLast7Days: number;
  };
  domains: {
    customTotal: number;
    customVerified: number;
    verificationRatePercent: number;
  };
  outbox: {
    pending: number;
    failed: number;
    sentLast24h: number;
  };
  billing: {
    grace: number;
    pastDue: number;
    trialing: number;
    active: number;
  };
  suppressions: {
    bounceTotal: number;
    addedLast7Days: number;
  };
};

export async function fetchMailPlatformKpi(accessToken: string) {
  return apiFetch<{ kpi: MailPlatformKpi }>(
    accessToken,
    "platform-admin/mail/kpi",
  );
}

export async function fetchMailPlatformMonitoring(accessToken: string) {
  return apiFetch<{ monitoring: MailPlatformMonitoring }>(
    accessToken,
    "platform-admin/mail/monitoring",
  );
}

export async function isPlatformOperator(accessToken: string): Promise<boolean> {
  try {
    await fetchOperatorDomains(accessToken);
    return true;
  } catch {
    return false;
  }
}

export async function fetchMailIdentity(accessToken: string) {
  return apiFetch<{
    identity: {
      fromAddress: string | null;
      domainVerified: boolean;
      domain: string;
      platformDnsReady: boolean;
    };
  }>(accessToken, "company/mail-identity");
}

export type MailPlanView = {
  planCode: string;
  displayName: string;
  tagline: string;
  monthlyPriceEur: number;
  annualPriceEur: number;
  recommended: boolean;
  mailMaxSendsPerHour: number;
  mailMaxMailboxes: number;
  mailStorageLimitGb?: number;
  mailMaxAttachmentMb?: number;
  customDomainAllowed: boolean;
  mailWhiteLabelAllowed?: boolean;
};

export type MailBrandingSnapshot = {
  allowed: boolean;
  planCode: string | null;
  logoUrl: string | null;
  emailBrandTitle: string | null;
  defaultFromDisplayName: string | null;
  hidePlatformEmailChrome: boolean;
  detailTr: string;
};

export async function fetchMailBranding(accessToken: string) {
  return apiFetch<{ branding: MailBrandingSnapshot }>(
    accessToken,
    "company/mail-identity/branding",
  );
}

export type MailIntegrationSnapshot = {
  allowed: boolean;
  planCode: string | null;
  detailTr: string;
  publicApiBasePath: string;
  availableWebhookEvents: (
    | "message.sent"
    | "message.failed"
    | "inbound.received"
  )[];
  apiKeys: {
    id: string;
    label: string;
    keyPrefix: string;
    lastUsedAt: string | null;
    createdAt: string;
  }[];
  webhooks: {
    id: string;
    url: string;
    events: string[];
    enabled: boolean;
    signingSecretPrefix: string;
  }[];
};

export type MailAliasRow = {
  id: string;
  aliasEmail: string;
  localPart: string;
  label: string | null;
  targets: { mailboxId: string; emailAddress: string }[];
  createdAt: string;
};

export async function fetchMailAliases(accessToken: string) {
  return apiFetch<{ aliases: MailAliasRow[] }>(
    accessToken,
    "company/mail-identity/aliases",
  );
}

export async function createMailAlias(
  accessToken: string,
  body: {
    mailDomainId: string;
    localPart: string;
    mailboxIds: string[];
    label?: string;
  },
) {
  return apiFetch<{ alias: MailAliasRow }>(
    accessToken,
    "company/mail-identity/aliases",
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function deleteMailAlias(accessToken: string, aliasId: string) {
  return apiFetch<{ ok: boolean }>(
    accessToken,
    `company/mail-identity/aliases/${aliasId}`,
    { method: "DELETE" },
  );
}

export async function fetchMailIntegration(accessToken: string) {
  return apiFetch<{ integration: MailIntegrationSnapshot }>(
    accessToken,
    "company/mail-identity/integration",
  );
}

export async function createMailApiKey(accessToken: string, label: string) {
  return apiFetch<{
    apiKey: {
      id: string;
      apiKey: string;
      keyPrefix: string;
      label: string;
    };
  }>(accessToken, "company/mail-identity/integration/api-keys", {
    method: "POST",
    body: JSON.stringify({ label }),
  });
}

export async function revokeMailApiKey(accessToken: string, id: string) {
  return apiFetch<{ ok: boolean }>(
    accessToken,
    `company/mail-identity/integration/api-keys/${id}`,
    { method: "DELETE" },
  );
}

export async function createMailWebhook(
  accessToken: string,
  body: { url: string; events: string[]; description?: string },
) {
  return apiFetch<{
    webhook: MailIntegrationSnapshot["webhooks"][number];
    signingSecret: string;
  }>(accessToken, "company/mail-identity/integration/webhooks", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateMailBranding(
  accessToken: string,
  body: {
    logoUrl?: string | null;
    emailBrandTitle?: string | null;
    defaultFromDisplayName?: string | null;
    hidePlatformEmailChrome?: boolean;
  },
) {
  return apiFetch<{ branding: MailBrandingSnapshot }>(
    accessToken,
    "company/mail-identity/branding",
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

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

export type MailSendRateQuota = {
  sendsLastHour: number;
  limitPerHour: number;
  remaining: number;
  utilizationPercent: number;
  nearLimit: boolean;
  atLimit: boolean;
  window: "hour";
  windowLabelTr: string;
};

export async function fetchMailSubscription(accessToken: string) {
  return apiFetch<{
    subscription: {
      planCode: string | null;
      isMailPlan: boolean;
      plan: MailPlanView | null;
      sendRate: number;
      sendRateQuota: MailSendRateQuota;
      storageQuota?: MailStorageQuota;
      mailboxQuota: { used: number; limit: number };
    };
  }>(accessToken, "company/mail-identity/subscription");
}

export async function fetchMailSendRate(accessToken: string) {
  return apiFetch<{ sendRateQuota: MailSendRateQuota }>(
    accessToken,
    "company/mail-identity/send-rate",
  );
}

export type MailDeliveryPanel = {
  days: number;
  periodStart: string;
  sent: {
    total: number;
    daily: { day: string; sentCount: number }[];
    recent: {
      id: string;
      toAddress: string;
      subject: string;
      sentAt: string;
      smtpMessageId: string | null;
    }[];
  };
  suppressions: {
    total: number;
    bounceRelated: number;
    items: {
      emailAddress: string;
      reason: string;
      source: string;
      note: string | null;
      updatedAt: string;
    }[];
  };
};

export async function fetchMailDeliveryPanel(
  accessToken: string,
  days = 7,
) {
  return apiFetch<{ panel: MailDeliveryPanel }>(
    accessToken,
    `company/mail-identity/delivery?days=${days}`,
  );
}

export async function addMailSuppression(
  accessToken: string,
  email: string,
  reason?: string,
) {
  await apiFetch(accessToken, "company/mail-identity/suppressions", {
    method: "POST",
    body: JSON.stringify({ email, reason: reason ?? "manual" }),
  });
}

export async function removeMailSuppression(
  accessToken: string,
  email: string,
) {
  await apiFetch(
    accessToken,
    `company/mail-identity/suppressions?email=${encodeURIComponent(email)}`,
    { method: "DELETE" },
  );
}

export type MailDmarcPanel = {
  days: number;
  domains: {
    domain: string;
    totals: {
      messageCount: number;
      dispositionNone: number;
      dispositionQuarantine: number;
      dispositionReject: number;
      dkimPass: number;
      dkimFail: number;
      spfPass: number;
      spfFail: number;
    };
    reports: {
      id: string;
      domain: string;
      periodStart: string;
      periodEnd: string;
      messageCount: number;
      disposition: { none: number; quarantine: number; reject: number };
      dkim: { pass: number; fail: number };
      spf: { pass: number; fail: number };
      reporterOrgName: string | null;
      ingestedAt: string;
    }[];
  }[];
};

export async function fetchMailDmarcPanel(accessToken: string, days = 30) {
  return apiFetch<{ panel: MailDmarcPanel }>(
    accessToken,
    `company/mail-identity/dmarc?days=${days}`,
  );
}

export type MailDeletionStatus = {
  hasRequest: boolean;
  request?: {
    id: string;
    status: "pending" | "cancelled" | "completed";
    reason: string | null;
    executeAfter: string;
    completedAt: string | null;
    createdAt: string;
  };
};

export async function fetchMailDeletionStatus(accessToken: string) {
  return apiFetch<MailDeletionStatus>(
    accessToken,
    "company/mail-identity/privacy/deletion-status",
  );
}

export async function downloadMailPrivacyExport(accessToken: string) {
  const response = await fetch(
    `${resolveApiBaseUrl()}/company/mail-identity/privacy/export`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Veri dışa aktarımı başarısız");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? "lerta-mail-export.json";
  return { blob, filename };
}

export async function createMailDeletionRequest(
  accessToken: string,
  params: { confirmPhrase: string; reason?: string },
) {
  return apiFetch<{
    requestId: string;
    confirmToken: string;
    executeAfter: string;
  }>(accessToken, "company/mail-identity/privacy/deletion-request", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function confirmMailDeletionRequest(
  accessToken: string,
  params: { requestId: string; confirmToken: string },
) {
  return apiFetch<{ ok: true; completedAt: string }>(
    accessToken,
    "company/mail-identity/privacy/deletion-request/confirm",
    {
      method: "POST",
      body: JSON.stringify(params),
    },
  );
}

export async function cancelMailDeletionRequest(
  accessToken: string,
  requestId: string,
) {
  return apiFetch<{ ok: true }>(
    accessToken,
    `company/mail-identity/privacy/deletion-request/${requestId}`,
    { method: "DELETE" },
  );
}

export type MailTenantAuditEntry = {
  id: string;
  actionCode: string;
  labelTr: string;
  summaryTr: string;
  actorUserId: string | null;
  actorEmail: string | null;
  requestPath: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export async function fetchMailTenantAudit(
  accessToken: string,
  params: { limit?: number; before?: string } = {},
) {
  const query = new URLSearchParams();
  if (params.limit) {
    query.set("limit", String(params.limit));
  }
  if (params.before) {
    query.set("before", params.before);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return apiFetch<{ logs: MailTenantAuditEntry[]; nextBefore: string | null }>(
    accessToken,
    `company/mail-identity/audit${suffix}`,
  );
}

export type MailBillingLifecycle = {
  status: string;
  billingProvider: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  inGrace: boolean;
  canSendMail: boolean;
  statusLabelTr: string;
  detailTr: string;
};

export async function fetchMailBillingLifecycle(accessToken: string) {
  return apiFetch<{ lifecycle: MailBillingLifecycle }>(
    accessToken,
    "company/mail-billing/lifecycle",
  );
}

export async function cancelMailSubscription(accessToken: string) {
  return apiFetch<{ lifecycle: MailBillingLifecycle }>(
    accessToken,
    "company/mail-billing/cancel",
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function resumeMailSubscription(accessToken: string) {
  return apiFetch<{ lifecycle: MailBillingLifecycle }>(
    accessToken,
    "company/mail-billing/resume",
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function fetchMailBillingStatus(accessToken: string) {
  return apiFetch<{
    status: {
      provider: string;
      checkout: {
        canStart: boolean;
        blockers: string[];
      };
      stripe: {
        configured: boolean;
        testMode: boolean;
        webhookConfigured: boolean;
        corporatePriceConfigured: boolean;
        corporatePriceValid: boolean | null;
        apiReachable: boolean | null;
        apiError: string | null;
      };
      iyzico: {
        apiConfigured: boolean;
        fallbackCheckoutUrlConfigured: boolean;
        callbackUrl: string;
        corporatePriceTry: string;
      };
    };
  }>(accessToken, "company/mail-billing/status");
}

export async function startCorporateCheckout(accessToken: string) {
  return apiFetch<{
    provider: string;
    url: string | null;
    message?: string;
  }>(accessToken, "company/mail-billing/checkout/corporate", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function fetchAuthSession(accessToken: string) {
  return apiFetch<{
    session: {
      roleCodes: string[];
      emailAddress: string;
    };
  }>(accessToken, "auth/session");
}

export async function fetchMailTeam(accessToken: string) {
  return apiFetch<{
    team: {
      companyLegalName: string;
      members: {
        membershipId: string;
        emailAddress: string;
        displayName: string;
        roleCode: string;
        joinedAt: string;
      }[];
      pendingInvites: {
        inviteId: string;
        email: string;
        roleCode: string;
        expiresAt: string;
      }[];
      invitableRoles: string[];
    };
    permissions: { canInvite: boolean; canManageRoles: boolean };
  }>(accessToken, "company/mail-identity/team");
}

export async function createMailTeamInvite(
  accessToken: string,
  email: string,
  roleCode: string,
) {
  return apiFetch<{ team: unknown }>(
    accessToken,
    "company/mail-identity/team/invites",
    {
      method: "POST",
      body: JSON.stringify({ email, roleCode }),
    },
  );
}

export async function revokeMailTeamInvite(
  accessToken: string,
  inviteId: string,
) {
  return apiFetch<{ team: unknown }>(
    accessToken,
    `company/mail-identity/team/invites/${inviteId}`,
    { method: "DELETE" },
  );
}

export async function updateMailTeamMemberRole(
  accessToken: string,
  membershipId: string,
  roleCode: string,
) {
  return apiFetch<{ team: unknown }>(
    accessToken,
    `company/mail-identity/team/members/${membershipId}/role`,
    {
      method: "PATCH",
      body: JSON.stringify({ roleCode }),
    },
  );
}

export async function removeMailTeamMember(
  accessToken: string,
  membershipId: string,
) {
  return apiFetch<{ team: unknown }>(
    accessToken,
    `company/mail-identity/team/members/${membershipId}`,
    { method: "DELETE" },
  );
}

export async function previewMailTeamInvite(token: string) {
  const response = await fetch(
    `${resolveApiBaseUrl()}/auth/mail-team-invite/preview?token=${encodeURIComponent(token)}`,
  );
  if (!response.ok) {
    throw new Error("Davet geçersiz");
  }
  const data = (await response.json()) as {
    preview: {
      companyLegalName: string;
      email: string;
      roleLabel: string;
      requiresRegistration: boolean;
    };
  };
  return data.preview;
}

export async function acceptMailTeamInvite(
  token: string,
  params: { password: string; displayName?: string },
) {
  const response = await fetch(
    `${resolveApiBaseUrl()}/auth/mail-team-invite/accept`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password: params.password,
        displayName: params.displayName,
      }),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Davet kabul edilemedi");
  }
  return (await response.json()) as { accessToken: string };
}

export async function selectMailPlan(accessToken: string, planCode: string) {
  return apiFetch<{ subscription: unknown }>(
    accessToken,
    "company/mail-identity/subscription/select",
    {
      method: "POST",
      body: JSON.stringify({ planCode }),
    },
  );
}
