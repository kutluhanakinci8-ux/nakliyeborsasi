export const TelemetryConsentPurposeCode = {
  FleetSafety: "FLEET_SAFETY",
  DispatchEta: "DISPATCH_ETA",
  RegulatoryEvidence: "REGULATORY_EVIDENCE",
  InsuranceClaims: "INSURANCE_CLAIMS",
  /** Telefon kullanımı / dikkat — native SDK; işveren politikası + ayrı onay. */
  DriverDistractionAnalytics: "DRIVER_DISTRACTION_ANALYTICS",
} as const;

export type TelemetryConsentPurposeCode =
  (typeof TelemetryConsentPurposeCode)[keyof typeof TelemetryConsentPurposeCode];

/** Bump when privacy notice / data categories change (GDPR accountability). */
export const TELEMETRY_CONSENT_DOCUMENT_VERSION = "2026-09-23-global-v2";
