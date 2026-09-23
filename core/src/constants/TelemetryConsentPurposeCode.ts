export const TelemetryConsentPurposeCode = {
  FleetSafety: "FLEET_SAFETY",
  DispatchEta: "DISPATCH_ETA",
  RegulatoryEvidence: "REGULATORY_EVIDENCE",
  InsuranceClaims: "INSURANCE_CLAIMS",
} as const;

export type TelemetryConsentPurposeCode =
  (typeof TelemetryConsentPurposeCode)[keyof typeof TelemetryConsentPurposeCode];

/** Bump when privacy notice / data categories change (GDPR accountability). */
export const TELEMETRY_CONSENT_DOCUMENT_VERSION = "2026-09-01-global-v1";
