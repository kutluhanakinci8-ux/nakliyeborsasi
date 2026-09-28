import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MailAiComposeService {
  public constructor(private readonly configService: ConfigService) {}

  public isEnabled(): boolean {
    return (
      this.configService.get<string>("LERTA_MAIL_AI_COMPOSE_ENABLED")?.trim() ===
      "true"
    );
  }

  public isLlmConfigured(): boolean {
    const apiKey = this.configService
      .get<string>("LERTA_MAIL_AI_COMPOSE_API_KEY")
      ?.trim();
    const apiUrl = this.resolveApiUrl();
    return Boolean(apiUrl && (apiKey || this.isOpenAiCompatibleUrl(apiUrl)));
  }

  private resolveApiUrl(): string | null {
    const explicit = this.configService
      .get<string>("LERTA_MAIL_AI_COMPOSE_API_URL")
      ?.trim();
    if (explicit) {
      return explicit.replace(/\/$/, "");
    }
    const apiKey = this.configService
      .get<string>("LERTA_MAIL_AI_COMPOSE_API_KEY")
      ?.trim();
    if (apiKey) {
      return "https://api.openai.com/v1/chat/completions";
    }
    return null;
  }

  private isOpenAiCompatibleUrl(url: string): boolean {
    return /openai\.com|azure\.com|api\.groq\.com/i.test(url);
  }

  public async suggestReply(input: {
    subject: string;
    fromAddress: string;
    bodySnippet: string;
    locale: string;
  }): Promise<{ suggestion: string; provider: string }> {
    const snippet = input.bodySnippet.trim().slice(0, 2000);
    if (!this.isEnabled()) {
      return {
        suggestion: this.offlineTemplate(input.locale, input.fromAddress, snippet),
        provider: "template",
      };
    }
    const apiUrl = this.resolveApiUrl();
    const apiKey = this.configService
      .get<string>("LERTA_MAIL_AI_COMPOSE_API_KEY")
      ?.trim();
    if (!apiUrl) {
      return {
        suggestion: this.offlineTemplate(input.locale, input.fromAddress, snippet),
        provider: "template",
      };
    }
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.configService.get<string>("LERTA_MAIL_AI_COMPOSE_MODEL") ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Kısa, profesyonel Türkçe e-posta yanıtı yaz. Sadece gövde metni, imza yok.",
          },
          {
            role: "user",
            content: `Konu: ${input.subject}\nGönderen: ${input.fromAddress}\n\n${snippet}`,
          },
        ],
        max_tokens: 400,
      }),
    });
    if (!response.ok) {
      return {
        suggestion: this.offlineTemplate(input.locale, input.fromAddress, snippet),
        provider: "template-fallback",
      };
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return {
        suggestion: this.offlineTemplate(input.locale, input.fromAddress, snippet),
        provider: "template-fallback",
      };
    }
    return { suggestion: text, provider: "llm" };
  }

  private offlineTemplate(
    locale: string,
    fromAddress: string,
    snippet: string,
  ): string {
    const tr = locale.toLowerCase().startsWith("tr");
    const greeting = tr ? "Merhaba," : "Hello,";
    const thanks = tr
      ? "Mesajınız için teşekkür ederiz."
      : "Thank you for your message.";
    const ref = snippet ? `\n\n${tr ? "Not:" : "Re:"} ${snippet.slice(0, 120)}…` : "";
    return `${greeting}\n\n${thanks}${ref}\n\n${tr ? "Saygılarımızla," : "Best regards,"}\n`;
  }
}
