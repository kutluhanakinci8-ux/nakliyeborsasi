import {
  buildLertaComTrLocalPartCandidates,
  isValidLertaComTrLocalPart,
} from "@nakliyeborsasi/core";
import { PublicApiConfiguration } from "./PublicApiConfiguration";
import { formatMailIdentityApiError } from "./CompanyMailIdentityApi";

export type LertaComTrSuggestResponse = {
  tenantDomain: string;
  candidates: {
    localPart: string;
    fullAddress: string;
    available: boolean;
  }[];
  platformDnsReady: boolean;
};

export type LertaComTrAvailabilityResponse = {
  tenantDomain: string;
  localPart: string;
  fullAddress: string;
  available: boolean;
  valid: boolean;
  reasonTr: string | null;
};

const ONBOARDING_SKIP_KEY = "lerta-com-tr-mail-onboarding-skipped";

export function suggestLocalPartsClientSide(
  companyLegalName: string,
): string[] {
  return buildLertaComTrLocalPartCandidates(companyLegalName || "firma");
}

export function isLocalPartFormatValid(localPart: string): boolean {
  return isValidLertaComTrLocalPart(localPart.trim().toLowerCase());
}

export async function fetchLertaComTrMailSuggestions(
  accessToken: string,
  companyLegalName: string,
): Promise<LertaComTrSuggestResponse> {
  const params = new URLSearchParams({
    companyLegalName: companyLegalName.trim(),
  });
  const response = await fetch(
    `${PublicApiConfiguration.resolveBaseUrl()}/company/mail-identity/onboarding/lerta-com-tr/suggest?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(formatMailIdentityApiError(text));
  }
  return (await response.json()) as LertaComTrSuggestResponse;
}

export async function fetchLertaComTrLocalPartAvailability(
  accessToken: string,
  localPart: string,
): Promise<LertaComTrAvailabilityResponse> {
  const params = new URLSearchParams({ localPart: localPart.trim() });
  const response = await fetch(
    `${PublicApiConfiguration.resolveBaseUrl()}/company/mail-identity/onboarding/lerta-com-tr/availability?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(formatMailIdentityApiError(text));
  }
  return (await response.json()) as LertaComTrAvailabilityResponse;
}

export function markLertaComTrMailOnboardingSkipped(companyId: string): void {
  if (!companyId) {
    return;
  }
  try {
    window.sessionStorage.setItem(`${ONBOARDING_SKIP_KEY}:${companyId}`, "1");
  } catch {
    /* ignore */
  }
}

export function wasLertaComTrMailOnboardingSkipped(
  companyId: string,
): boolean {
  if (!companyId) {
    return false;
  }
  try {
    return (
      window.sessionStorage.getItem(`${ONBOARDING_SKIP_KEY}:${companyId}`) ===
      "1"
    );
  } catch {
    return false;
  }
}
