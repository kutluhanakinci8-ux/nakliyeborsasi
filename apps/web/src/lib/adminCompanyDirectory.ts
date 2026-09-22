import { MarketplaceApiClient } from "./MarketplaceApiClient";
import {
  PlatformAdminApiClient,
  formatParticipantType,
} from "./PlatformAdminApiClient";

export type AdminCompanyListItem = {
  companyId: string;
  label: string;
  source: "session" | "marketplace" | "manual" | "api";
};

const MANUAL_REGISTRY_KEY = "nb-admin-company-directory";

export function loadManualCompanyIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(MANUAL_REGISTRY_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function removeManualCompanyId(companyId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const ids = loadManualCompanyIds().filter((id) => id !== companyId);
  window.localStorage.setItem(MANUAL_REGISTRY_KEY, JSON.stringify(ids));
}

export function addManualCompanyId(companyId: string): void {
  const trimmed = companyId.trim();
  if (!trimmed || typeof window === "undefined") {
    return;
  }
  const ids = loadManualCompanyIds();
  if (!ids.includes(trimmed)) {
    window.localStorage.setItem(
      MANUAL_REGISTRY_KEY,
      JSON.stringify([trimmed, ...ids]),
    );
  }
}

export async function discoverCompanies(
  accessToken: string,
  locale: string,
  sessionCompanyId: string,
): Promise<AdminCompanyListItem[]> {
  const map = new Map<string, AdminCompanyListItem>();

  try {
    const apiCompanies = await PlatformAdminApiClient.fetchCompanies(accessToken);
    for (const company of apiCompanies) {
      map.set(company.id, {
        companyId: company.id,
        label: `${company.legalName} · ${formatParticipantType(company.participantTypeCode)}`,
        source: "api",
      });
    }
    if (map.size > 0) {
      return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "tr"));
    }
  } catch {
    // platform-admin yalnızca operatör JWT ile çalışır
  }

  if (sessionCompanyId) {
    map.set(sessionCompanyId, {
      companyId: sessionCompanyId,
      label: `Oturum · ${sessionCompanyId.slice(0, 8)}`,
      source: "session",
    });
  }

  for (const id of loadManualCompanyIds()) {
    if (!map.has(id)) {
      map.set(id, {
        companyId: id,
        label: `Manuel · ${id.slice(0, 8)}`,
        source: "manual",
      });
    }
  }

  try {
    const payload = (await MarketplaceApiClient.fetchListings(
      accessToken,
      locale,
    )) as { listings: { ownerCompanyId: string }[] };
    for (const listing of payload.listings ?? []) {
      const id = listing.ownerCompanyId;
      if (!id || map.has(id)) {
        continue;
      }
      map.set(id, {
        companyId: id,
        label: `İlan sahibi · ${id.slice(0, 8)}`,
        source: "marketplace",
      });
    }
  } catch {
    // marketplace optional for directory
  }

  return [...map.values()].sort((a, b) => a.companyId.localeCompare(b.companyId));
}
