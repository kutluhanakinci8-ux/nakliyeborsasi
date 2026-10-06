import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserNotificationPreferenceService } from "./UserNotificationPreferenceService";

@Injectable()
export class MailAiComposeService {
  private readonly logger = new Logger(MailAiComposeService.name);

  public constructor(
    private readonly configService: ConfigService,
    private readonly userNotificationPreferenceService: UserNotificationPreferenceService,
  ) {}

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
    userId: string;
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
    const llmAllowed = await this.canUseLlm(input.userId);
    if (!llmAllowed) {
      return {
        suggestion: this.offlineTemplate(input.locale, input.fromAddress, snippet),
        provider: "template-consent",
      };
    }
    const text = await this.completeChat(
      [
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
      400,
    );
    if (!text) {
      return {
        suggestion: this.offlineTemplate(input.locale, input.fromAddress, snippet),
        provider: "template-fallback",
      };
    }
    this.logger.log(`AI suggest-reply user=${input.userId} provider=llm`);
    return { suggestion: text, provider: "llm" };
  }

  public async suggestOutboundDraft(input: {
    userId: string;
    subject: string;
    locale: string;
  }): Promise<{ suggestion: string; provider: string }> {
    const subject = input.subject.trim().slice(0, 500);
    const tr = input.locale.toLowerCase().startsWith("tr");
    const fallback = tr
      ? `Merhaba,\n\n${subject ? `«${subject}» konulu mesajımızla ilgili bilgilendirme yapmak istiyoruz.\n\n` : ""}Detayları paylaşmaktan memnuniyet duyarız.\n\nSaygılarımızla,`
      : `Hello,\n\n${subject ? `Regarding «${subject}», ` : ""}we would like to share the following update.\n\nBest regards,`;
    if (!this.isEnabled()) {
      return { suggestion: fallback, provider: "template" };
    }
    const llmAllowed = await this.canUseLlm(input.userId);
    if (!llmAllowed) {
      return { suggestion: fallback, provider: "template-consent" };
    }
    const text = await this.completeChat(
      [
        {
          role: "system",
          content:
            "Kısa, profesyonel Türkçe e-posta gövdesi yaz (yeni mesaj, yanıt değil). İmza yok.",
        },
        {
          role: "user",
          content: subject
            ? `Konu: ${subject}`
            : "Genel kurumsal bilgilendirme e-postası",
        },
      ],
      400,
    );
    if (!text) {
      return { suggestion: fallback, provider: "template-fallback" };
    }
    this.logger.log(`AI suggest-compose user=${input.userId} provider=llm`);
    return { suggestion: text, provider: "llm" };
  }

  public async summarizeMessage(input: {
    userId: string;
    subject: string;
    bodySnippet: string;
    locale: string;
  }): Promise<{ summary: string; provider: string }> {
    const snippet = input.bodySnippet.trim().slice(0, 4000);
    if (!this.isEnabled() || !(await this.canUseLlm(input.userId))) {
      const tr = input.locale.toLowerCase().startsWith("tr");
      const fallback = snippet
        ? snippet.slice(0, 240)
        : tr
          ? "Özet için yeterli metin yok."
          : "Not enough text to summarize.";
      return { summary: fallback, provider: "template" };
    }
    const text = await this.completeChat(
      [
        {
          role: "system",
          content:
            "E-postayı 2-3 cümleyle Türkçe özetle. Madde işareti kullanma.",
        },
        {
          role: "user",
          content: `Konu: ${input.subject}\n\n${snippet}`,
        },
      ],
      220,
    );
    if (!text) {
      return { summary: snippet.slice(0, 240), provider: "template-fallback" };
    }
    this.logger.log(`AI summarize user=${input.userId}`);
    return { summary: text, provider: "llm" };
  }

  public isMessagingSummaryLlmEnabled(): boolean {
    return (
      this.configService.get<string>("MESSAGING_SUMMARY_LLM")?.trim() ===
        "true" && this.isEnabled()
    );
  }

  public async summarizeMessagingThread(input: {
    userId: string;
    locale: string;
    transcript: string;
  }): Promise<{ summary: string; provider: string }> {
    const transcript = input.transcript.trim().slice(0, 6000);
    if (!transcript) {
      return {
        summary: input.locale.toLowerCase().startsWith("tr")
          ? "Özet için henüz mesaj yok."
          : "No messages to summarize yet.",
        provider: "empty",
      };
    }
    if (
      !this.isMessagingSummaryLlmEnabled() ||
      !(await this.canUseLlm(input.userId))
    ) {
      const lines = transcript.split("\n").filter(Boolean);
      const tail = lines.slice(-6).join(" ");
      return {
        summary: tail.slice(0, 400),
        provider: "template",
      };
    }
    const text = await this.completeChat(
      [
        {
          role: "system",
          content:
            "Lojistik firma sohbeti transkriptini Türkçe 3-5 cümleyle özetle: konu, fiyat/teklif durumu, sonraki adım.",
        },
        { role: "user", content: transcript },
      ],
      280,
    );
    if (!text) {
      return { summary: transcript.slice(0, 400), provider: "template-fallback" };
    }
    this.logger.log(`AI messaging thread summary user=${input.userId}`);
    return { summary: text, provider: "llm" };
  }

  public async classifyInbound(input: {
    userId: string;
    subject: string;
    bodySnippet: string;
  }): Promise<{ label: string; provider: string }> {
    const snippet = `${input.subject}\n${input.bodySnippet}`.slice(0, 2000);
    if (!this.isEnabled() || !(await this.canUseLlm(input.userId))) {
      const lower = snippet.toLowerCase();
      if (/fatura|invoice|ödeme|payment/.test(lower)) {
        return { label: "billing", provider: "rules" };
      }
      if (/teklif|offer|ihale|auction/.test(lower)) {
        return { label: "commercial", provider: "rules" };
      }
      return { label: "general", provider: "rules" };
    }
    const text = await this.completeChat(
      [
        {
          role: "system",
          content:
            'Gelen e-postayı tek kelimeyle sınıflandır: billing, support, commercial, spam_suspect veya general. Sadece kelimeyi yaz.',
        },
        { role: "user", content: snippet },
      ],
      16,
    );
    const label = text?.toLowerCase().replace(/[^a-z_]/g, "") || "general";
    return { label, provider: "llm" };
  }

  private async canUseLlm(userId: string): Promise<boolean> {
    if (!this.isLlmConfigured()) {
      return false;
    }
    const requireConsent =
      this.configService.get<string>("LERTA_MAIL_AI_REQUIRE_CONSENT")?.trim() !==
      "false";
    if (!requireConsent) {
      return true;
    }
    return await this.userNotificationPreferenceService.hasAiMailAssistConsent(
      userId,
    );
  }

  private async completeChat(
    messages: { role: string; content: string }[],
    maxTokens: number,
  ): Promise<string | null> {
    const apiUrl = this.resolveApiUrl();
    const apiKey = this.configService
      .get<string>("LERTA_MAIL_AI_COMPOSE_API_KEY")
      ?.trim();
    if (!apiUrl) {
      return null;
    }
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model:
          this.configService.get<string>("LERTA_MAIL_AI_COMPOSE_MODEL") ??
          "gpt-4o-mini",
        messages,
        max_tokens: maxTokens,
      }),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return payload.choices?.[0]?.message?.content?.trim() ?? null;
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
