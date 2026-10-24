import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { In, IsNull, Not, Repository } from "typeorm";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import {
  MailImapMaildirService,
  type MaildirMailboxFolder,
} from "./MailImapMaildirService";
import {
  MailInboxActor,
  MailMailboxAccessService,
} from "./MailMailboxAccessService";

@Injectable()
export class MailImapMaildirReconcileService {
  private readonly logger = new Logger(MailImapMaildirReconcileService.name);

  public constructor(
    private readonly mailImapMaildirService: MailImapMaildirService,
    private readonly mailMailboxAccessService: MailMailboxAccessService,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
  ) {}

  public async reconcileAllOrganizations(limitPerOrg = 400): Promise<{
    organizations: number;
    scanned: number;
    updatedFolder: number;
    relocatedPath: number;
    missingOnDisk: number;
  }> {
    if (!this.mailImapMaildirService.isEnabled()) {
      return {
        organizations: 0,
        scanned: 0,
        updatedFolder: 0,
        relocatedPath: 0,
        missingOnDisk: 0,
      };
    }
    const rows = await this.mailboxRepository
      .createQueryBuilder("m")
      .select("DISTINCT m.organizationId", "organizationId")
      .where("m.status = :status", { status: "active" })
      .getRawMany<{ organizationId: string }>();
    let scanned = 0;
    let updatedFolder = 0;
    let relocatedPath = 0;
    let missingOnDisk = 0;
    for (const row of rows) {
      const outcome = await this.reconcileForOrganization(
        row.organizationId,
        undefined,
        limitPerOrg,
      );
      scanned += outcome.scanned;
      updatedFolder += outcome.updatedFolder;
      relocatedPath += outcome.relocatedPath;
      missingOnDisk += outcome.missingOnDisk;
    }
    return {
      organizations: rows.length,
      scanned,
      updatedFolder,
      relocatedPath,
      missingOnDisk,
    };
  }

  public async reconcileForOrganization(
    organizationId: string,
    actor?: MailInboxActor,
    limit = 500,
  ): Promise<{
    scanned: number;
    updatedFolder: number;
    relocatedPath: number;
    missingOnDisk: number;
  }> {
    if (!this.mailImapMaildirService.isEnabled()) {
      return {
        scanned: 0,
        updatedFolder: 0,
        relocatedPath: 0,
        missingOnDisk: 0,
      };
    }
    const mailboxIds = actor
      ? await this.mailMailboxAccessService.resolveAccessibleMailboxIds(actor)
      : await this.mailMailboxAccessService.allMailboxIdsForOrganization(
          organizationId,
        );
    if (mailboxIds.length === 0) {
      return {
        scanned: 0,
        updatedFolder: 0,
        relocatedPath: 0,
        missingOnDisk: 0,
      };
    }
    const mailboxes = await this.mailboxRepository.find({
      where: { id: In(mailboxIds) },
    });
    const emailByMailboxId = new Map(
      mailboxes.map((m) => [m.id, m.emailAddress]),
    );
    const safeLimit = Math.min(Math.max(limit, 1), 2000);
    const rows = await this.inboundRepository.find({
      where: {
        mailboxId: In(mailboxIds),
        maildirFilePath: Not(IsNull()),
      },
      order: { receivedAt: "DESC" },
      take: safeLimit,
    });

    let updatedFolder = 0;
    let relocatedPath = 0;
    let missingOnDisk = 0;

    for (const row of rows) {
      const path = row.maildirFilePath;
      if (!path) {
        continue;
      }
      const mailboxEmail = emailByMailboxId.get(row.mailboxId) ?? null;
      let effectivePath = path;
      if (!existsSync(path)) {
        const found = mailboxEmail
          ? this.mailImapMaildirService.findMaildirFileByBasename(
              mailboxEmail,
              basename(path),
            )
          : null;
        if (!found) {
          missingOnDisk += 1;
          continue;
        }
        row.maildirFilePath = found.path;
        effectivePath = found.path;
        relocatedPath += 1;
        const folderFromFound = this.mapMaildirFolder(found.folder);
        if (folderFromFound !== (row.mailboxFolder ?? "inbox")) {
          row.mailboxFolder = folderFromFound;
          updatedFolder += 1;
        }
      } else {
        const inferred = this.inferFolderFromPath(effectivePath);
        const current = row.mailboxFolder ?? "inbox";
        if (inferred !== current) {
          row.mailboxFolder = inferred;
          updatedFolder += 1;
        }
      }
      await this.inboundRepository.save(row);
    }

    this.logger.log(
      `IMAP maildir reconcile org=${organizationId} scanned=${rows.length} folder=${updatedFolder} path=${relocatedPath}`,
    );
    return {
      scanned: rows.length,
      updatedFolder,
      relocatedPath,
      missingOnDisk,
    };
  }

  private mapMaildirFolder(
    folder: MaildirMailboxFolder,
  ): "inbox" | "archive" | "trash" {
    if (folder === "archive") {
      return "archive";
    }
    if (folder === "trash") {
      return "trash";
    }
    return "inbox";
  }

  private inferFolderFromPath(filePath: string): "inbox" | "archive" | "trash" {
    const normalized = filePath.replace(/\\/g, "/");
    if (normalized.includes("/.Trash/")) {
      return "trash";
    }
    if (normalized.includes("/.Archive/")) {
      return "archive";
    }
    return "inbox";
  }
}
