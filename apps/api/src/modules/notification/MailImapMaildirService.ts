import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { maildirSegmentForCustomFolder } from "../../common/mailImapModifiedUtf7.util";

export type MaildirMailboxFolder = "inbox" | "archive" | "trash" | "junk";

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
          : target === "junk"
            ? join(".Junk", "new")
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

  /** IMAP Sent klasörü (Dovecot `.Sent`) — Thunderbird/Apple Mail senkronu. */
  public appendSentMessage(params: {
    mailboxEmail: string;
    rawMime: string;
    messageId: string;
  }): string | null {
    const root = this.resolveMaildirRoot();
    if (!root) {
      return null;
    }
    const at = params.mailboxEmail.lastIndexOf("@");
    if (at < 1) {
      return null;
    }
    const local = params.mailboxEmail.slice(0, at);
    const domain = params.mailboxEmail.slice(at + 1);
    const sentCur = join(root, domain, local, "Maildir", ".Sent", "cur");
    mkdirSync(sentCur, { recursive: true });
    const safeId = params.messageId.replace(/[^a-zA-Z0-9-]/g, "") || "sent";
    const path = join(sentCur, `${Date.now()}.${safeId}.eml:2,S`);
    writeFileSync(path, params.rawMime, { encoding: "utf8" });
    this.logger.debug(`Maildir Sent append ${path}`);
    return path;
  }

  /** Dovecot/Thunderbird standart klasör iskeleti (PM-5). */
  public ensureStandardFolders(mailboxEmail: string): string[] {
    const root = this.resolveMaildirRoot();
    if (!root) {
      return [];
    }
    const at = mailboxEmail.lastIndexOf("@");
    if (at < 1) {
      return [];
    }
    const local = mailboxEmail.slice(0, at);
    const domain = mailboxEmail.slice(at + 1);
    const base = join(root, domain, local, "Maildir");
    const created: string[] = [];
    for (const sub of [
      "new",
      "cur",
      "tmp",
      ".Sent/cur",
      ".Sent/new",
      ".Archive/new",
      ".Trash/new",
      ".Junk/new",
    ]) {
      const dir = join(base, sub);
      mkdirSync(dir, { recursive: true });
      created.push(dir);
    }
    return created;
  }

  /** Webmail özel klasörü — IMAP maildir iskeleti (Thunderbird LIST ile eşleşen iç ad). */
  public ensureCustomFolderMaildir(
    mailboxEmail: string,
    folderId: string,
  ): string | null {
    const root = this.resolveMaildirRoot();
    if (!root) {
      return null;
    }
    const at = mailboxEmail.lastIndexOf("@");
    if (at < 1) {
      return null;
    }
    const local = mailboxEmail.slice(0, at);
    const domain = mailboxEmail.slice(at + 1);
    const segment = maildirSegmentForCustomFolder(folderId);
    const newDir = join(root, domain, local, "Maildir", segment, "new");
    const curDir = join(root, domain, local, "Maildir", segment, "cur");
    mkdirSync(newDir, { recursive: true });
    mkdirSync(curDir, { recursive: true });
    this.logger.debug(`Maildir custom folder ${segment} for ${mailboxEmail}`);
    return segment;
  }

  /** Thunderbird/Dovecot taşıması sonrası dosyayı klasörler arasında bul. */
  public findMaildirFileByBasename(
    mailboxEmail: string,
    fileBasename: string,
  ): { path: string; folder: MaildirMailboxFolder } | null {
    const maildir = this.resolveMaildirForAddress(mailboxEmail);
    if (!maildir || !fileBasename.trim()) {
      return null;
    }
    const base = fileBasename.split(":")[0] ?? fileBasename;
    const subdirs: Array<{ sub: string; folder: MaildirMailboxFolder }> = [
      { sub: "new", folder: "inbox" },
      { sub: "cur", folder: "inbox" },
      { sub: ".Archive/new", folder: "archive" },
      { sub: ".Archive/cur", folder: "archive" },
      { sub: ".Trash/new", folder: "trash" },
      { sub: ".Trash/cur", folder: "trash" },
      { sub: ".Junk/new", folder: "junk" },
      { sub: ".Junk/cur", folder: "junk" },
    ];
    for (const { sub, folder } of subdirs) {
      const dir = join(maildir, sub);
      if (!existsSync(dir)) {
        continue;
      }
      for (const name of readdirSync(dir)) {
        if (name === base || name.startsWith(`${base}:`)) {
          return { path: join(dir, name), folder };
        }
      }
    }
    return null;
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
