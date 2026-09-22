export type OrganizationProfile = {
  tradeName: string;
  legalName: string;
  taxNumber: string;
  mersisNumber: string;
  taxOfficeLine: string;
  tradeRegistryNumber: string;
  transportLicenseNumber: string;
  kepAddress: string;
  city: string;
  countryCode: string;
  phone: string;
  whatsappNumber: string;
  website: string;
  addressLine: string;
  workingHours: string;
  companyDescription: string;
  servicesSummary: string;
  /** @deprecated Eski kayıtlar — yüklemede ayrı alanlara taşınır */
  socialMediaSummary: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  logoUrl: string;
  websiteScannedUrls: string;
  websiteEnrichmentCompletedAt: string;
  corridors: string[];
  primaryEmail: string;
};

export type DocumentVerificationStatus = "pending" | "approved" | "rejected";

export type OrganizationAdminSettings = {
  emailVerified: boolean;
  documentStatus: DocumentVerificationStatus;
  verificationLevel: "basic" | "full";
  adminNotes: string;
  supportTicketRef: string;
  accountFrozen: boolean;
  featuredInSearch: boolean;
  allowAuctions: boolean;
  allowNewListings: boolean;
  updatedAt: string;
  updatedBy: string;
};

export const CORRIDOR_OPTIONS = [
  { code: "TR", label: "Türkiye" },
  { code: "UA", label: "Ukrayna" },
  { code: "EU", label: "AB / EU" },
] as const;

const PROFILE_STORAGE_PREFIX = "nb-organization-profile:";
const ADMIN_STORAGE_PREFIX = "nb-organization-admin:";
const AUDIT_STORAGE_PREFIX = "nb-organization-admin-audit:";

export function defaultOrganizationProfile(
  companyId: string,
  primaryEmail = "",
): OrganizationProfile {
  return {
    tradeName: companyId ? `Firma ${companyId.slice(0, 8)}` : "",
    legalName: "",
    taxNumber: "",
    mersisNumber: "",
    taxOfficeLine: "",
    tradeRegistryNumber: "",
    transportLicenseNumber: "",
    kepAddress: "",
    city: "",
    countryCode: "TR",
    phone: "",
    whatsappNumber: "",
    website: "",
    addressLine: "",
    workingHours: "",
    companyDescription: "",
    servicesSummary: "",
    socialMediaSummary: "",
    facebookUrl: "",
    instagramUrl: "",
    twitterUrl: "",
    youtubeUrl: "",
    linkedinUrl: "",
    logoUrl: "",
    websiteScannedUrls: "",
    websiteEnrichmentCompletedAt: "",
    corridors: ["TR", "UA", "EU"],
    primaryEmail,
  };
}

export function defaultAdminSettings(updatedBy = "system"): OrganizationAdminSettings {
  return {
    emailVerified: true,
    documentStatus: "pending",
    verificationLevel: "basic",
    adminNotes: "",
    supportTicketRef: "",
    accountFrozen: false,
    featuredInSearch: false,
    allowAuctions: true,
    allowNewListings: true,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}

function splitLegacySocialMediaSummary(summary: string): Partial<OrganizationProfile> {
  const parts = summary
    .split(/·|\|/)
    .map((part) => part.trim())
    .filter(Boolean);
  const patch: Partial<OrganizationProfile> = {};
  for (const url of parts) {
    const lower = url.toLowerCase();
    if (lower.includes("facebook.com") && !patch.facebookUrl) {
      patch.facebookUrl = url;
    } else if (lower.includes("instagram.com") && !patch.instagramUrl) {
      patch.instagramUrl = url;
    } else if (
      (lower.includes("twitter.com") || lower.includes("x.com")) &&
      !patch.twitterUrl
    ) {
      patch.twitterUrl = url;
    } else if (lower.includes("youtube.com") && !patch.youtubeUrl) {
      patch.youtubeUrl = url;
    } else if (lower.includes("linkedin.com") && !patch.linkedinUrl) {
      patch.linkedinUrl = url;
    }
  }
  return patch;
}

export function migrateOrganizationProfile(
  profile: OrganizationProfile,
): OrganizationProfile {
  const hasDedicated =
    profile.facebookUrl.trim() ||
    profile.instagramUrl.trim() ||
    profile.twitterUrl.trim() ||
    profile.youtubeUrl.trim() ||
    profile.linkedinUrl.trim();
  if (hasDedicated || !profile.socialMediaSummary.trim()) {
    return profile;
  }
  return {
    ...profile,
    ...splitLegacySocialMediaSummary(profile.socialMediaSummary),
  };
}

export function loadOrganizationLogoUrl(companyId: string): string {
  if (!companyId || typeof window === "undefined") {
    return "";
  }
  return loadOrganizationProfile(companyId).logoUrl.trim();
}

export function loadOrganizationProfile(
  companyId: string,
  primaryEmail = "",
): OrganizationProfile {
  if (typeof window === "undefined" || !companyId) {
    return defaultOrganizationProfile(companyId, primaryEmail);
  }
  const raw = window.localStorage.getItem(`${PROFILE_STORAGE_PREFIX}${companyId}`);
  if (!raw) {
    return defaultOrganizationProfile(companyId, primaryEmail);
  }
  try {
    return migrateOrganizationProfile({
      ...defaultOrganizationProfile(companyId, primaryEmail),
      ...(JSON.parse(raw) as OrganizationProfile),
    });
  } catch {
    return defaultOrganizationProfile(companyId, primaryEmail);
  }
}

export function applyRegistrationOrganizationProfile(
  companyId: string,
  payload: {
    legalName: string;
    countryCode: string;
    emailAddress: string;
    website: string;
    tradeName?: string;
    phone?: string;
    city?: string;
    taxNumber?: string;
    addressLine?: string;
  },
): void {
  const profile = loadOrganizationProfile(companyId, payload.emailAddress);
  saveOrganizationProfile(companyId, {
    ...profile,
    legalName: payload.legalName,
    tradeName: payload.tradeName?.trim() || payload.legalName,
    countryCode: payload.countryCode,
    primaryEmail: payload.emailAddress,
    website: payload.website.trim(),
    phone: payload.phone?.trim() ?? profile.phone,
    city: payload.city?.trim() ?? profile.city,
    taxNumber: payload.taxNumber?.trim() ?? profile.taxNumber,
  });
}

export function saveOrganizationProfile(
  companyId: string,
  profile: OrganizationProfile,
): void {
  if (typeof window === "undefined" || !companyId) {
    return;
  }
  window.localStorage.setItem(
    `${PROFILE_STORAGE_PREFIX}${companyId}`,
    JSON.stringify(profile),
  );
}

export function loadOrganizationAdminSettings(
  companyId: string,
): OrganizationAdminSettings {
  if (typeof window === "undefined" || !companyId) {
    return defaultAdminSettings();
  }
  const raw = window.localStorage.getItem(`${ADMIN_STORAGE_PREFIX}${companyId}`);
  if (!raw) {
    return defaultAdminSettings();
  }
  try {
    return {
      ...defaultAdminSettings(),
      ...(JSON.parse(raw) as OrganizationAdminSettings),
    };
  } catch {
    return defaultAdminSettings();
  }
}

export function saveOrganizationAdminSettings(
  companyId: string,
  settings: OrganizationAdminSettings,
): void {
  if (typeof window === "undefined" || !companyId) {
    return;
  }
  window.localStorage.setItem(
    `${ADMIN_STORAGE_PREFIX}${companyId}`,
    JSON.stringify(settings),
  );
}

export type OrganizationAuditEntry = {
  id: string;
  at: string;
  actorEmail: string;
  summary: string;
};

export function appendOrganizationAudit(
  companyId: string,
  actorEmail: string,
  summary: string,
): void {
  if (typeof window === "undefined" || !companyId) {
    return;
  }
  const key = `${AUDIT_STORAGE_PREFIX}${companyId}`;
  const existing = loadOrganizationAudit(companyId);
  const entry: OrganizationAuditEntry = {
    id: `audit-${Date.now()}`,
    at: new Date().toISOString(),
    actorEmail,
    summary,
  };
  window.localStorage.setItem(
    key,
    JSON.stringify([entry, ...existing].slice(0, 50)),
  );
}

export function clearOrganizationLocalData(companyId: string): void {
  if (typeof window === "undefined" || !companyId) {
    return;
  }
  window.localStorage.removeItem(`${PROFILE_STORAGE_PREFIX}${companyId}`);
  window.localStorage.removeItem(`${ADMIN_STORAGE_PREFIX}${companyId}`);
  window.localStorage.removeItem(`${AUDIT_STORAGE_PREFIX}${companyId}`);
  window.localStorage.removeItem(`nb-pending-website-enrichment:${companyId}`);
}

export function loadOrganizationAudit(companyId: string): OrganizationAuditEntry[] {
  if (typeof window === "undefined" || !companyId) {
    return [];
  }
  const raw = window.localStorage.getItem(`${AUDIT_STORAGE_PREFIX}${companyId}`);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as OrganizationAuditEntry[];
  } catch {
    return [];
  }
}

export function documentStatusLabel(status: DocumentVerificationStatus): string {
  switch (status) {
    case "approved":
      return "Firma belgesi onaylı";
    case "rejected":
      return "Belge reddedildi";
    default:
      return "Firma belgesi bekleniyor";
  }
}
