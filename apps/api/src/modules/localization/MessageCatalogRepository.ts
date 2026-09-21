import { Injectable } from "@nestjs/common";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALE_VALUES,
  SupportedLocale,
  ValidationException,
} from "@nakliyeborsasi/core";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class MessageCatalogRepository {
  private readonly catalogs: Map<string, Record<string, string>> = new Map();

  public constructor() {
    this.loadCatalog(SupportedLocale.Turkish);
    this.loadCatalog(SupportedLocale.English);
    this.loadCatalog(SupportedLocale.Ukrainian);
    this.loadCatalog(SupportedLocale.Russian);
  }

  public resolveMessage(
    locale: string,
    messageKey: string,
    placeholders: Record<string, string> = {},
  ): string {
    const normalizedLocale = this.normalizeLocale(locale);
    const catalog =
      this.catalogs.get(normalizedLocale) ??
      this.catalogs.get(DEFAULT_LOCALE)!;
    const template = catalog[messageKey] ?? messageKey;
    return Object.entries(placeholders).reduce(
      (current, [key, value]) =>
        current.replace(new RegExp(`\\{${key}\\}`, "g"), value),
      template,
    );
  }

  private normalizeLocale(locale: string): string {
    const candidate = locale.split(",")[0]?.trim().split("-")[0] ?? DEFAULT_LOCALE;
    if (!SUPPORTED_LOCALE_VALUES.includes(candidate)) {
      return DEFAULT_LOCALE;
    }
    return candidate;
  }

  private loadCatalog(locale: SupportedLocale): void {
    const catalogPath = path.join(
      __dirname,
      "..",
      "..",
      "assets",
      "i18n",
      `${locale}.json`,
    );
    if (!fs.existsSync(catalogPath)) {
      throw new ValidationException(`Missing i18n catalog: ${locale}`);
    }
    const rawContent = fs.readFileSync(catalogPath, "utf-8");
    this.catalogs.set(locale, JSON.parse(rawContent) as Record<string, string>);
  }
}
