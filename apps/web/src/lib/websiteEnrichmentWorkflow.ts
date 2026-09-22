import {
  AuthApiClient,
  type CompanyWebsiteEnrichment,
} from "./AuthApiClient";
import {
  loadOrganizationProfile,
  saveOrganizationProfile,
  type OrganizationProfile,
} from "./organizationProfile";

const PENDING_ENRICHMENT_PREFIX = "nb-pending-website-enrichment:";

export function queueWebsiteEnrichmentAfterRegistration(
  companyId: string,
  websiteUrl: string,
): void {
  const trimmed = websiteUrl.trim();
  if (!companyId || !trimmed || typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(`${PENDING_ENRICHMENT_PREFIX}${companyId}`, trimmed);
}

export function getPendingWebsiteEnrichmentUrl(companyId: string): string | null {
  if (typeof window === "undefined" || !companyId) {
    return null;
  }
  return window.localStorage.getItem(`${PENDING_ENRICHMENT_PREFIX}${companyId}`);
}

export function clearPendingWebsiteEnrichment(companyId: string): void {
  if (typeof window === "undefined" || !companyId) {
    return;
  }
  window.localStorage.removeItem(`${PENDING_ENRICHMENT_PREFIX}${companyId}`);
}

function mergeEnrichmentIntoProfile(
  profile: OrganizationProfile,
  enrichment: CompanyWebsiteEnrichment,
): OrganizationProfile {
  return {
    ...profile,
    website: profile.website.trim() || enrichment.sourceUrl,
    tradeName:
      profile.tradeName.trim() ||
      enrichment.tradeName ||
      enrichment.companyLegalName ||
      profile.tradeName,
    legalName:
      profile.legalName.trim() ||
      enrichment.companyLegalName ||
      profile.legalName,
    taxNumber: profile.taxNumber.trim() || enrichment.taxOrRegistryId || "",
    city: profile.city.trim() || enrichment.city || "",
    phone: profile.phone.trim() || enrichment.phone || "",
    primaryEmail:
      profile.primaryEmail.trim() || enrichment.emailAddress || profile.primaryEmail,
    addressLine: profile.addressLine.trim() || enrichment.addressLine || "",
    servicesSummary:
      profile.servicesSummary.trim() || enrichment.servicesSummary || "",
    logoUrl: profile.logoUrl.trim() || enrichment.logoUrl || "",
    websiteEnrichmentCompletedAt: new Date().toISOString(),
  };
}

export async function runPendingWebsiteEnrichment(
  companyId: string,
  primaryEmail: string,
): Promise<"none" | "success" | "error"> {
  const pendingUrl = getPendingWebsiteEnrichmentUrl(companyId);
  if (!pendingUrl) {
    return "none";
  }
  try {
    const enrichment = await AuthApiClient.enrichCompanyWebsite(pendingUrl);
    const profile = loadOrganizationProfile(companyId, primaryEmail);
    saveOrganizationProfile(
      companyId,
      mergeEnrichmentIntoProfile(profile, enrichment),
    );
    clearPendingWebsiteEnrichment(companyId);
    return "success";
  } catch {
    return "error";
  }
}
