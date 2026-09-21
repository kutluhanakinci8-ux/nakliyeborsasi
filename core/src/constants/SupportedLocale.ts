export enum SupportedLocale {
  Turkish = "tr",
  English = "en",
  Ukrainian = "uk",
  Russian = "ru",
}

export const DEFAULT_LOCALE = SupportedLocale.Turkish;

export const SUPPORTED_LOCALE_VALUES: readonly string[] = Object.values(
  SupportedLocale,
);
