import {
  AuthApiClient,
  type CompanyWebsiteEnrichment,
} from "./AuthApiClient";
import { refreshInstagramStatsForOrganization } from "./instagramStatsWorkflow";
import { scrubMergedContactFromAddress } from "@nakliyeborsasi/core";
import {
  loadOrganizationProfile,
  normalizeEnrichedTextField,
  normalizeOrganizationPhoneField,
  saveOrganizationProfile,
  type OrganizationProfile,
} from "./organizationProfile";

const PENDING_ENRICHMENT_PREFIX = "nb-pending-website-enrichment:";

function pickWhatsappFromEnrichment(
  current: string,
  incoming: string | null | undefined,
): string {
  const trimmed = current.trim();
  const next = incoming?.trim() ?? "";
  if (!next) {
    return trimmed;
  }
  if (!trimmed) {
    return next;
  }
  if (trimmed.includes("·") && !next.includes("·")) {
    return next;
  }
  return trimmed;
}

function pickFirstNonEmpty(
  current: string,
  ...candidates: (string | null | undefined)[]
): string {
  const trimmed = current.trim();
  if (trimmed) {
    return trimmed;
  }
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) {
      return value;
    }
  }
  return "";
}

export function mergeEnrichmentIntoProfile(
  profile: OrganizationProfile,
  enrichment: CompanyWebsiteEnrichment,
): OrganizationProfile {
  const mersis =
    pickFirstNonEmpty(profile.mersisNumber, enrichment.mersisNumber) ||
    (enrichment.taxOrRegistryId?.match(/\d{16}/)?.[0] ?? "");
  const taxNumber = pickFirstNonEmpty(
    profile.taxNumber,
    mersis || undefined,
    enrichment.taxOrRegistryId,
  );
  const scannedUrls =
    enrichment.scannedUrls?.length > 0
      ? enrichment.scannedUrls.join("\n")
      : enrichment.sourceUrl;

  return {
    ...profile,
    website: pickFirstNonEmpty(profile.website, enrichment.sourceUrl),
    tradeName: pickFirstNonEmpty(
      profile.tradeName,
      enrichment.tradeName,
      enrichment.companyLegalName,
    ),
    legalName: pickFirstNonEmpty(
      profile.legalName,
      enrichment.companyLegalName,
    ),
    taxNumber,
    mersisNumber: mersis,
    taxOfficeLine: pickFirstNonEmpty(
      profile.taxOfficeLine,
      enrichment.taxOfficeLine,
    ),
    tradeRegistryNumber: pickFirstNonEmpty(
      profile.tradeRegistryNumber,
      enrichment.tradeRegistryNumber,
    ),
    transportLicenseNumber: pickFirstNonEmpty(
      profile.transportLicenseNumber,
      enrichment.transportLicenseNumber,
    ),
    kepAddress: pickFirstNonEmpty(profile.kepAddress, enrichment.kepAddress),
    city: pickFirstNonEmpty(profile.city, enrichment.city),
    phone: normalizeOrganizationPhoneField(
      pickFirstNonEmpty(profile.phone, enrichment.phone),
    ),
    whatsappNumber: normalizeOrganizationPhoneField(
      pickWhatsappFromEnrichment(
        profile.whatsappNumber,
        enrichment.whatsappNumber,
      ),
    ),
    primaryEmail: pickFirstNonEmpty(
      profile.primaryEmail,
      enrichment.emailAddress,
    ),
    addressLine: scrubMergedContactFromAddress(
      normalizeEnrichedTextField(
        pickFirstNonEmpty(profile.addressLine, enrichment.addressLine),
      ),
    ),
    workingHours: pickFirstNonEmpty(
      profile.workingHours,
      enrichment.workingHours,
    ),
    companyDescription: normalizeEnrichedTextField(
      pickFirstNonEmpty(
        profile.companyDescription,
        enrichment.companyDescription,
      ),
    ),
    servicesSummary: pickFirstNonEmpty(
      profile.servicesSummary,
      enrichment.servicesSummary,
    ),
    facebookUrl: pickFirstNonEmpty(profile.facebookUrl, enrichment.facebookUrl),
    instagramUrl: pickFirstNonEmpty(
      profile.instagramUrl,
      enrichment.instagramUrl,
    ),
    twitterUrl: pickFirstNonEmpty(profile.twitterUrl, enrichment.twitterUrl),
    youtubeUrl: pickFirstNonEmpty(profile.youtubeUrl, enrichment.youtubeUrl),
    linkedinUrl: pickFirstNonEmpty(profile.linkedinUrl, enrichment.linkedinUrl),
    logoUrl: pickFirstNonEmpty(profile.logoUrl, enrichment.logoUrl),
    websiteScannedUrls: pickFirstNonEmpty(
      profile.websiteScannedUrls,
      scannedUrls,
    ),
    websiteEnrichmentCompletedAt: new Date().toISOString(),
  };
}

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

export async function enrichOrganizationFromWebsite(
  companyId: string,
  primaryEmail: string,
  websiteUrl: string,
): Promise<"success" | "error"> {
  const trimmed = websiteUrl.trim();
  if (!companyId || !trimmed) {
    return "error";
  }
  try {
    const enrichment = await AuthApiClient.enrichCompanyWebsite(trimmed);
    const profile = loadOrganizationProfile(companyId, primaryEmail);
    const merged = mergeEnrichmentIntoProfile(profile, enrichment);
    saveOrganizationProfile(companyId, merged);
    if (merged.instagramUrl.trim()) {
      await refreshInstagramStatsForOrganization(
        companyId,
        primaryEmail,
        merged.instagramUrl,
        false,
      );
    }
    return "success";
  } catch {
    return "error";
  }
}

export async function runPendingWebsiteEnrichment(
  companyId: string,
  primaryEmail: string,
): Promise<"none" | "success" | "error"> {
  const pendingUrl = getPendingWebsiteEnrichmentUrl(companyId);
  if (!pendingUrl) {
    return "none";
  }
  const outcome = await enrichOrganizationFromWebsite(
    companyId,
    primaryEmail,
    pendingUrl,
  );
  if (outcome === "success") {
    clearPendingWebsiteEnrichment(companyId);
  }
  return outcome;
}
