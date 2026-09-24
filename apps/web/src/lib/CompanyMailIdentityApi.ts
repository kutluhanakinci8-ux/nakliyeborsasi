import { PublicApiConfiguration } from "./PublicApiConfiguration";

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
