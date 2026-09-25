import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

@Injectable()
export class MailImapMaildirService {
  private readonly logger = new Logger(MailImapMaildirService.name);

  public constructor(private readonly configService: ConfigService) {}

  public isEnabled(): boolean {
    return Boolean(this.resolveMaildirRoot());
  }

  public deliverToMaildir(params: {
    recipient: string;
    rawMime: string;
    messageId: string;
  }): string | null {
    const root = this.resolveMaildirRoot();
    if (!root) {
      return null;
    }
    const at = params.recipient.lastIndexOf("@");
    if (at < 1) {
      return null;
    }
    const local = params.recipient.slice(0, at);
    const domain = params.recipient.slice(at + 1);
    const maildir = join(root, domain, local, "Maildir", "new");
    mkdirSync(maildir, { recursive: true });
    const safeId = params.messageId.replace(/[^a-zA-Z0-9-]/g, "");
    const path = join(maildir, `${Date.now()}.${safeId}.eml`);
    writeFileSync(path, params.rawMime, { encoding: "utf8" });
    this.logger.debug(`Maildir delivery ${path}`);
    return path;
  }

  public resolveMaildirForAddress(email: string): string | null {
    const root = this.resolveMaildirRoot();
    if (!root) {
      return null;
    }
    const at = email.lastIndexOf("@");
    if (at < 1) {
      return null;
    }
    return join(root, email.slice(at + 1), email.slice(0, at), "Maildir");
  }

  private resolveMaildirRoot(): string | null {
    const raw = this.configService.get<string>("MAIL_IMAP_MAILDIR_ROOT")?.trim();
    return raw || null;
  }
}
