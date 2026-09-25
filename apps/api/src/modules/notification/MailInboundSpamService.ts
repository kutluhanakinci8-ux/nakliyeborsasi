import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailSuppressionService } from "./EmailSuppressionService";

export type InboundSpamVerdict = {
  spamStatus: "clean" | "suspected" | "blocked";
  spamReason: string | null;
};

@Injectable()
export class MailInboundSpamService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly emailSuppressionService: EmailSuppressionService,
  ) {}

  public async evaluate(params: {
    fromAddress: string;
    subject: string;
    bodyText: string | null;
    organizationId: string | null;
  }): Promise<InboundSpamVerdict> {
    const from = params.fromAddress.toLowerCase();
    const haystack = `${params.subject}\n${params.bodyText ?? ""}`.toLowerCase();

    const suppressed = await this.emailSuppressionService.isSuppressed(
      from,
      params.organizationId,
    );
    if (suppressed) {
      return {
        spamStatus: "blocked",
        spamReason: "Gönderen platform/org suppression listesinde",
      };
    }

    const blockFrom = this.parseList("MAIL_INBOUND_SPAM_BLOCK_FROM");
    if (blockFrom.some((entry) => from === entry || from.endsWith(`@${entry}`))) {
      return { spamStatus: "blocked", spamReason: "Gönderen engelli domain/adres" };
    }

    const keywords = this.parseList("MAIL_INBOUND_SPAM_KEYWORDS");
    for (const keyword of keywords) {
      if (keyword && haystack.includes(keyword.toLowerCase())) {
        return {
          spamStatus: "suspected",
          spamReason: `Anahtar kelime: ${keyword}`,
        };
      }
    }

    const maxBytes = this.resolveMaxBodyBytes();
    if ((params.bodyText?.length ?? 0) > maxBytes) {
      return {
        spamStatus: "suspected",
        spamReason: `Gövde boyutu limiti (${maxBytes} karakter)`,
      };
    }

    return { spamStatus: "clean", spamReason: null };
  }

  private parseList(envKey: string): string[] {
    const raw = this.configService.get<string>(envKey)?.trim();
    if (!raw) {
      return [];
    }
    return raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  private resolveMaxBodyBytes(): number {
    const raw = this.configService.get<string>("MAIL_INBOUND_SPAM_MAX_BODY_CHARS");
    const parsed = raw ? Number.parseInt(raw, 10) : 120_000;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 120_000;
  }
}
