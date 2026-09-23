import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type CompanyWebsiteEnrichment = {
  sourceUrl: string;
  scannedUrls: string[];
  companyLegalName: string | null;
  tradeName: string | null;
  emailAddress: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  taxOrRegistryId: string | null;
  mersisNumber: string | null;
  taxOfficeLine: string | null;
  tradeRegistryNumber: string | null;
  transportLicenseNumber: string | null;
  kepAddress: string | null;
  addressLine: string | null;
  city: string | null;
  workingHours: string | null;
  companyDescription: string | null;
  servicesSummary: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  linkedinUrl: string | null;
  logoUrl: string | null;
};

export type InstagramPublicStats = {
  username: string | null;
  followersCount: number | null;
  followingCount: number | null;
  postsCount: number | null;
  source: "meta_graph" | "web_profile_info" | "unavailable";
  errorMessage: string | null;
};

export type CompanyParticipantTypeCode =
  | "LOAD_SHIPPER"
  | "LOAD_CARRIER"
  | "LOAD_SEEKER";

export type RegisterCompanyUserPayload = {
  emailAddress: string;
  password: string;
  displayName: string;
  companyLegalName: string;
  companyCountryCode: string;
  companyParticipantTypeCode: CompanyParticipantTypeCode;
  companyWebsiteUrl?: string;
};

export class AuthApiClient {
  public static async enrichCompanyWebsite(
    websiteUrl: string,
  ): Promise<CompanyWebsiteEnrichment> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/auth/enrich-company-website`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl }),
      },
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        AuthApiClient.mapAuthErrorMessage(errorBody) ||
          "Web sitesi bilgileri alınamadı",
      );
    }
    const payload = (await response.json()) as {
      enrichment: CompanyWebsiteEnrichment;
    };
    return payload.enrichment;
  }

  public static async fetchInstagramGraphStatus(): Promise<{
    configured: boolean;
    actorId: string | null;
    mode: "env" | "none";
  }> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/auth/instagram-graph-status`,
    );
    if (!response.ok) {
      return { configured: false, actorId: null, mode: "none" };
    }
    const payload = (await response.json()) as {
      connection: {
        configured: boolean;
        actorId: string | null;
        mode: "env" | "none";
      };
    };
    return payload.connection;
  }

  public static async enrichInstagramStats(
    instagramUrl: string,
  ): Promise<InstagramPublicStats> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/auth/enrich-instagram-stats`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramUrl }),
      },
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        AuthApiClient.mapAuthErrorMessage(errorBody) ||
          "Instagram istatistikleri alınamadı",
      );
    }
    const payload = (await response.json()) as { stats: InstagramPublicStats };
    return payload.stats;
  }

  public static async register(
    payload: RegisterCompanyUserPayload,
  ): Promise<{ accessToken: string }> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        AuthApiClient.mapAuthErrorMessage(errorBody) || "Kayıt başarısız",
      );
    }
    return response.json() as Promise<{ accessToken: string }>;
  }

  public static async login(
    emailAddress: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    let response: Response;
    try {
      response = await fetch(
        `${PublicApiConfiguration.resolveBaseUrl()}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailAddress, password }),
        },
      );
    } catch {
      throw new Error(
        "Sunucuya bağlanılamadı. iPhone’da https://168.231.109.27/login kullanın (HTTP :3011 veya karışık bağlantı «Load failed» verir).",
      );
    }
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        AuthApiClient.mapAuthErrorMessage(errorBody) || "Giriş başarısız",
      );
    }
    return response.json() as Promise<{ accessToken: string }>;
  }

  private static mapAuthErrorMessage(raw: string): string {
    if (!raw) {
      return "";
    }
    if (raw.includes("Email address is already registered")) {
      return "Bu e-posta adresi zaten kayıtlı.";
    }
    if (raw.includes("Invalid credentials")) {
      return "E-posta veya şifre hatalı.";
    }
    try {
      const parsed = JSON.parse(raw) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) {
        return parsed.message.join(" ");
      }
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      /* plain text */
    }
    return raw.length > 160 ? "İşlem tamamlanamadı." : raw;
  }
}
