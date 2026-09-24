import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type CustomDomainBundle = {
  mailDomain: { id: string; domain: string; verificationStatus: string } | null;
  dnsInstructions: {
    domain: string;
    spfHost: string;
    spfValue: string;
    dkimHost: string;
    dkimTxt: string;
    dmarcHost: string;
    dmarcValue: string;
    vpsOpendkimScript: string;
  } | null;
  dnsCheck: {
    ok: boolean;
    spf: { ok: boolean; detail: string };
    dkim: { ok: boolean; detail: string };
  } | null;
  fromAddress: string | null;
};

export type CompanyMailIdentitySnapshot = {
  domain: string;
  platformDnsReady: boolean;
  domainVerified: boolean;
  dnsCheck: {
    ok: boolean;
    domain: string;
    spf: { ok: boolean; detail: string };
    dkim: { ok: boolean; detail: string };
  };
  sender: {
    id: string;
    localPart: string;
    displayName: string | null;
    isDefault: boolean;
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
  const response = await fetch(
    `${PublicApiConfiguration.resolveBaseUrl()}/${path}`,
    { ...init, headers },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API failed: ${path}`);
  }
  return (await response.json()) as T;
}

export async function fetchCustomDomainBundle(
  accessToken: string,
): Promise<CustomDomainBundle> {
  const payload = await apiFetch<{ bundle: CustomDomainBundle }>(
    accessToken,
    "company/mail-identity/custom-domain",
  );
  return payload.bundle;
}

export async function registerCustomDomain(
  accessToken: string,
  domain: string,
): Promise<CustomDomainBundle> {
  const payload = await apiFetch<{ bundle: CustomDomainBundle }>(
    accessToken,
    "company/mail-identity/custom-domain",
    { method: "POST", body: JSON.stringify({ domain }) },
  );
  return payload.bundle;
}

export async function verifyCustomDomainDns(accessToken: string): Promise<void> {
  await apiFetch(accessToken, "company/mail-identity/custom-domain/verify-dns", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function provisionCustomDomainSender(
  accessToken: string,
  localPart: string,
  displayName?: string,
): Promise<{ fromAddress: string }> {
  const payload = await apiFetch<{ fromAddress: string }>(
    accessToken,
    "company/mail-identity/custom-domain/provision",
    {
      method: "POST",
      body: JSON.stringify({ localPart, displayName }),
    },
  );
  return { fromAddress: payload.fromAddress };
}

export async function fetchCompanyMailIdentity(
  accessToken: string,
): Promise<CompanyMailIdentitySnapshot> {
  const payload = await apiFetch<{
    identity: CompanyMailIdentitySnapshot;
  }>(accessToken, "company/mail-identity");
  return payload.identity;
}

export async function provisionCompanyMailIdentity(
  accessToken: string,
  body: { localPart: string; displayName?: string },
): Promise<{ fromAddress: string }> {
  const payload = await apiFetch<{
    fromAddress: string;
  }>(accessToken, "company/mail-identity/provision", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { fromAddress: payload.fromAddress };
}

export async function updateCompanyMailDisplayName(
  accessToken: string,
  displayName: string,
): Promise<void> {
  await apiFetch(accessToken, "company/mail-identity/display-name", {
    method: "PATCH",
    body: JSON.stringify({ displayName }),
  });
}

export type OrgSuppressionRow = {
  organizationId: string;
  emailAddress: string;
  reason: string;
  source: string;
  note: string | null;
};

export async function fetchOrgSuppressions(
  accessToken: string,
): Promise<OrgSuppressionRow[]> {
  const payload = await apiFetch<{ suppressions: OrgSuppressionRow[] }>(
    accessToken,
    "company/mail-identity/suppressions",
  );
  return payload.suppressions;
}

export async function addOrgSuppression(
  accessToken: string,
  email: string,
): Promise<void> {
  await apiFetch(accessToken, "company/mail-identity/suppressions", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function removeOrgSuppression(
  accessToken: string,
  email: string,
): Promise<void> {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(
    `${PublicApiConfiguration.resolveBaseUrl()}/company/mail-identity/suppressions?email=${encodeURIComponent(email)}`,
    { method: "DELETE", headers },
  );
  if (!response.ok) {
    throw new Error("DELETE suppression failed");
  }
}
