import { Injectable } from "@nestjs/common";
import { DEFAULT_LOCALE } from "@nakliyeborsasi/core";
import { MessageCatalogRepository } from "./MessageCatalogRepository";

@Injectable()
export class LocaleResolutionService {
  public constructor(
    private readonly messageCatalogRepository: MessageCatalogRepository,
  ) {}

  public resolveFromHeaders(
    acceptLanguageHeader: string | undefined,
    queryLanguage: string | undefined,
  ): string {
    if (queryLanguage && queryLanguage.length > 0) {
      return queryLanguage;
    }
    if (acceptLanguageHeader && acceptLanguageHeader.length > 0) {
      return acceptLanguageHeader;
    }
    return DEFAULT_LOCALE;
  }

  public translate(
    locale: string,
    messageKey: string,
    placeholders: Record<string, string> = {},
  ): string {
    return this.messageCatalogRepository.resolveMessage(
      locale,
      messageKey,
      placeholders,
    );
  }
}
