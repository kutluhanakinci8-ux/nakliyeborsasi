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

export async function login(emailAddress: string, password: string) {
  const response = await fetch(`${resolveApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailAddress, password }),
  });
  if (!response.ok) {
    throw new Error("Giriş başarısız");
  }
  const payload = (await response.json()) as { accessToken: string };
  return payload.accessToken;
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

export async function fetchOperatorDomains(accessToken: string) {
  return apiFetch<{ domains: unknown[] }>(
    accessToken,
    "platform-admin/mail/domains",
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
  customDomainAllowed: boolean;
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
