import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type RegisterCompanyUserPayload = {
  emailAddress: string;
  password: string;
  displayName: string;
  companyLegalName: string;
  companyCountryCode: string;
};

export class AuthApiClient {
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
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAddress, password }),
      },
    );
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
