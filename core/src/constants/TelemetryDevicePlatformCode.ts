export const TelemetryDevicePlatformCode = {
  Ios: "IOS",
  Android: "ANDROID",
  WebCompanion: "WEB_COMPANION",
} as const;

export type TelemetryDevicePlatformCode =
  (typeof TelemetryDevicePlatformCode)[keyof typeof TelemetryDevicePlatformCode];
