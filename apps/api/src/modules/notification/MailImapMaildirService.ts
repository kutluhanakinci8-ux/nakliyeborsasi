import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

export type MaildirMailboxFolder = "inbox" | "archive" | "trash";

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

  public relocateMailboxFile(
    currentPath: string | null,
    target: MaildirMailboxFolder,
  ): string | null {
    if (!currentPath || !existsSync(currentPath)) {
      return currentPath;
    }
    const maildirRoot = this.resolveMaildirRootFromFile(currentPath);
    if (!maildirRoot) {
      return currentPath;
    }
    const destSubdir =
      target === "inbox"
        ? join("new")
        : target === "archive"
          ? join(".Archive", "new")
          : join(".Trash", "new");
    const destDir = join(maildirRoot, destSubdir);
    mkdirSync(destDir, { recursive: true });
    const destPath = join(destDir, basename(currentPath));
    try {
      renameSync(currentPath, destPath);
      this.logger.debug(`Maildir move ${currentPath} → ${destPath}`);
      return destPath;
    } catch (error) {
      this.logger.warn(
        `Maildir move failed: ${error instanceof Error ? error.message : error}`,
      );
      return currentPath;
    }
  }

  public deleteMailboxFile(path: string | null): void {
    if (!path || !existsSync(path)) {
      return;
    }
    try {
      unlinkSync(path);
    } catch (error) {
      this.logger.warn(
        `Maildir delete failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  public renameMailboxHomedir(oldEmail: string, newEmail: string): boolean {
    const root = this.resolveMaildirRoot();
    if (!root) {
      return false;
    }
    const parse = (email: string) => {
      const at = email.lastIndexOf("@");
      if (at < 1) {
        return null;
      }
      return {
        local: email.slice(0, at),
        domain: email.slice(at + 1),
      };
    };
    const from = parse(oldEmail.trim().toLowerCase());
    const to = parse(newEmail.trim().toLowerCase());
    if (!from || !to) {
      return false;
    }
    const oldHome = join(root, from.domain, from.local);
    const newHome = join(root, to.domain, to.local);
    if (!existsSync(oldHome)) {
      return false;
    }
    if (existsSync(newHome)) {
      this.logger.warn(`Maildir rename skipped — target exists: ${newHome}`);
      return false;
    }
    try {
      mkdirSync(join(root, to.domain), { recursive: true });
      renameSync(oldHome, newHome);
      this.logger.log(`Maildir homedir ${oldHome} → ${newHome}`);
      return true;
    } catch (error) {
      this.logger.warn(
        `Maildir homedir rename failed: ${error instanceof Error ? error.message : error}`,
      );
      return false;
    }
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

  private resolveMaildirRootFromFile(filePath: string): string | null {
    const marker = "/Maildir/";
    const idx = filePath.indexOf(marker);
    if (idx < 0) {
      return null;
    }
    return filePath.slice(0, idx + "/Maildir".length);
  }

  private resolveMaildirRoot(): string | null {
    const raw = this.configService.get<string>("MAIL_IMAP_MAILDIR_ROOT")?.trim();
    return raw || null;
  }
}
