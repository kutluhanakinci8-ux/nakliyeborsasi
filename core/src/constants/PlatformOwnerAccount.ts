import { CompanyParticipantTypeCode } from "./CompanyParticipantTypeCode";
import { PLATFORM_PRIMARY_CONTACT_EMAIL } from "./PlatformBranding";

/** Tek platform sahibi / operatör hesabı (admin konsol + tam yetki). */
export const PLATFORM_OWNER_EMAIL = PLATFORM_PRIMARY_CONTACT_EMAIL;

/**
 * İlk kurulum şifresi — giriş yaptıktan sonra profilden değiştirin.
 * Ortam değişkeni `PLATFORM_OWNER_BOOTSTRAP_PASSWORD` ile geçersiz kılınabilir.
 */
export const PLATFORM_OWNER_BOOTSTRAP_PASSWORD = "822159Ka";

export const PLATFORM_OWNER_DISPLAY_NAME = "Lerta Logistics";

export const PLATFORM_OWNER_COMPANY_LEGAL_NAME = "Lerta Logistics";

export const PLATFORM_OWNER_COMPANY_COUNTRY_CODE = "TR";

export const PLATFORM_OWNER_PARTICIPANT_TYPE =
  CompanyParticipantTypeCode.LoadShipper;

export const PLATFORM_OWNER_SUBSCRIPTION_PLAN_CODE = "carrier_starter_tr_ua";
