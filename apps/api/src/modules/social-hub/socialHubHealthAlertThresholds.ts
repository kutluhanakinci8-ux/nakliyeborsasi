import { SocialPlatformCode } from "@nakliyeborsasi/core";

export type HealthAlertSeverity = "attention" | "critical";

export type HealthAlertThresholdSettings = {
  healthAlertMinSeverity: HealthAlertSeverity;
  healthAlertFailureThreshold: number;
  healthAlertPlatformThresholdsJson: string | null;
};

const SEVERITY_RANK: Record<HealthAlertSeverity | "healthy", number> = {
  healthy: 0,
  attention: 1,
  critical: 2,
};

export function parsePlatformThresholds(
  json: string | null | undefined,
): Partial<Record<SocialPlatformCode, number>> {
  if (!json?.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(json) as Record<string, number>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function resolveFailureThreshold(
  platformCode: string,
  settings: HealthAlertThresholdSettings,
): number {
  const perPlatform = parsePlatformThresholds(settings.healthAlertPlatformThresholdsJson);
  const override = perPlatform[platformCode as SocialPlatformCode];
  if (typeof override === "number" && override > 0) {
    return Math.floor(override);
  }
  const base = settings.healthAlertFailureThreshold;
  return base > 0 ? Math.floor(base) : 1;
}

export function shouldSendHealthAlert(
  overallStatus: "healthy" | "attention" | "critical",
  settings: HealthAlertThresholdSettings,
): boolean {
  if (overallStatus === "healthy") {
    return false;
  }
  const min = settings.healthAlertMinSeverity ?? "attention";
  return SEVERITY_RANK[overallStatus] >= SEVERITY_RANK[min];
}

export function adjustOverallForFailureThresholds(params: {
  overallStatus: "healthy" | "attention" | "critical";
  channels: Array<{
    platformCode: string;
    tokenHealth: string;
    setupWarnings: string[];
    recentOutboundFailures24h: number;
  }>;
  settings: HealthAlertThresholdSettings;
}): "healthy" | "attention" | "critical" {
  if (params.overallStatus === "critical") {
    return "critical";
  }
  const hasTokenOrSetup = params.channels.some(
    (channel) =>
      channel.tokenHealth === "expired" ||
      channel.tokenHealth === "missing" ||
      channel.setupWarnings.length > 0,
  );
  if (hasTokenOrSetup) {
    return params.overallStatus;
  }
  const hasHighFailures = params.channels.some(
    (channel) =>
      channel.recentOutboundFailures24h >=
      resolveFailureThreshold(channel.platformCode, params.settings),
  );
  if (!hasHighFailures && params.overallStatus === "attention") {
    return "healthy";
  }
  return params.overallStatus;
}
