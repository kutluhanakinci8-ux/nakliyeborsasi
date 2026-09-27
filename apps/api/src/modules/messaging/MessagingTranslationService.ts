import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MessagingTranslationService {
  public constructor(private readonly configService: ConfigService) {}

  public async translateText(
    text: string,
    targetLocale: string,
  ): Promise<{ translatedText: string; provider: string }> {
    const trimmed = text.trim();
    if (!trimmed) {
      return { translatedText: "", provider: "none" };
    }
    const apiUrl = this.configService
      .get<string>("MESSAGING_TRANSLATE_API_URL")
      ?.trim();
    const target = this.normalizeTarget(targetLocale);
    if (!apiUrl) {
      return {
        translatedText: trimmed,
        provider: "passthrough",
      };
    }
    const response = await fetch(apiUrl.replace(/\/$/, ""), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: trimmed,
        source: "auto",
        target,
        format: "text",
      }),
    });
    if (!response.ok) {
      throw new Error(`Translation provider error (${response.status})`);
    }
    const payload = (await response.json()) as { translatedText?: string };
    const translated = payload.translatedText?.trim();
    if (!translated) {
      throw new Error("Translation provider returned empty text");
    }
    return { translatedText: translated, provider: "libretranslate" };
  }

  private normalizeTarget(locale: string): string {
    const code = locale.toLowerCase().split("-")[0];
    if (code === "tr" || code === "en" || code === "de" || code === "ru") {
      return code;
    }
    return "en";
  }
}
