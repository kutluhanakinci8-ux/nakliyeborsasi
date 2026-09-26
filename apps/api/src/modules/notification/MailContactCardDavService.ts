import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "node:crypto";
import { Repository } from "typeorm";
import { MailContactCardDavAccountEntity } from "../../infrastructure/database/entities/MailContactCardDavAccountEntity";
import { MailOrgContactEntity } from "../../infrastructure/database/entities/MailOrgContactEntity";
import {
  decryptCalendarCredential,
  encryptCalendarCredential,
} from "./MailCalendarCalDavCredentialCipher";
import {
  calDavDeleteResource,
  calDavPropfind,
  cardDavAddressbookQuery,
  cardDavPutVcard,
  joinCalDavResourceUrl,
} from "./MailCalDavHttp";
import { buildSingleVcard, parseVcfContacts } from "./MailVcfUtil";

const MAX_ACCOUNTS = 3;

export type MailContactCardDavAccountDto = {
  id: string;
  label: string;
  addressbookUrl: string;
  username: string;
  enabled: boolean;
  writeEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class MailContactCardDavService {
  public constructor(
    @InjectRepository(MailContactCardDavAccountEntity)
    private readonly accountRepository: Repository<MailContactCardDavAccountEntity>,
    @InjectRepository(MailOrgContactEntity)
    private readonly contactRepository: Repository<MailOrgContactEntity>,
    private readonly configService: ConfigService,
  ) {}

  public async list(
    organizationId: string,
  ): Promise<MailContactCardDavAccountDto[]> {
    const rows = await this.accountRepository.find({
      where: { organizationId },
      order: { createdAt: "ASC" },
    });
    return rows.map((row) => this.toDto(row));
  }

  public async create(
    organizationId: string,
    input: {
      label: string;
      addressbookUrl: string;
      username: string;
      password: string;
      enabled?: boolean;
      writeEnabled?: boolean;
    },
  ): Promise<MailContactCardDavAccountDto> {
    const count = await this.accountRepository.count({
      where: { organizationId },
    });
    if (count >= MAX_ACCOUNTS) {
      throw new BadRequestException(`En fazla ${MAX_ACCOUNTS} CardDAV hesabı.`);
    }
    const addressbookUrl = this.normalizeAddressbookUrl(input.addressbookUrl);
    const password = input.password.trim();
    if (password.length < 1) {
      throw new BadRequestException("Şifre gerekli.");
    }
    await calDavPropfind(addressbookUrl, input.username.trim(), password);
    const row = await this.accountRepository.save(
      this.accountRepository.create({
        organizationId,
        label: input.label.trim(),
        addressbookUrl,
        username: input.username.trim(),
        passwordCiphertext: encryptCalendarCredential(
          password,
          this.configService,
        ),
        enabled: input.enabled ?? true,
        writeEnabled: input.writeEnabled ?? true,
        lastSyncedAt: null,
        lastSyncError: null,
      }),
    );
    return this.toDto(row);
  }

  public async update(
    organizationId: string,
    accountId: string,
    input: {
      label?: string;
      addressbookUrl?: string;
      username?: string;
      password?: string;
      enabled?: boolean;
      writeEnabled?: boolean;
    },
  ): Promise<MailContactCardDavAccountDto> {
    const row = await this.assertAccount(organizationId, accountId);
    if (input.label !== undefined) {
      row.label = input.label.trim();
    }
    if (input.username !== undefined) {
      row.username = input.username.trim();
    }
    if (input.enabled !== undefined) {
      row.enabled = input.enabled;
    }
    if (input.writeEnabled !== undefined) {
      row.writeEnabled = input.writeEnabled;
    }
    if (input.addressbookUrl !== undefined) {
      row.addressbookUrl = this.normalizeAddressbookUrl(input.addressbookUrl);
    }
    if (input.password !== undefined && input.password.trim().length > 0) {
      row.passwordCiphertext = encryptCalendarCredential(
        input.password.trim(),
        this.configService,
      );
    }
    const password = decryptCalendarCredential(
      row.passwordCiphertext,
      this.configService,
    );
    await calDavPropfind(row.addressbookUrl, row.username, password);
    await this.accountRepository.save(row);
    return this.toDto(row);
  }

  public async delete(organizationId: string, accountId: string): Promise<void> {
    await this.assertAccount(organizationId, accountId);
    await this.contactRepository.delete({
      organizationId,
      carddavAccountId: accountId,
    });
    await this.accountRepository.delete({ id: accountId, organizationId });
  }

  public async sync(
    organizationId: string,
    accountId: string,
  ): Promise<{ imported: number; updated: number; removed: number }> {
    const account = await this.assertAccount(organizationId, accountId);
    if (!account.enabled) {
      throw new BadRequestException("Bu CardDAV hesabı devre dışı.");
    }
    const outcome = await this.syncAccountRow(account);
    if (!outcome.ok) {
      throw new BadRequestException(outcome.error);
    }
    return {
      imported: outcome.imported,
      updated: outcome.updated,
      removed: outcome.removed,
    };
  }

  public async syncAllForOrganization(organizationId: string): Promise<{
    accounts: number;
    succeeded: number;
    failed: number;
    imported: number;
    updated: number;
    removed: number;
  }> {
    const rows = await this.accountRepository.find({
      where: { organizationId, enabled: true },
      order: { createdAt: "ASC" },
    });
    let succeeded = 0;
    let failed = 0;
    let imported = 0;
    let updated = 0;
    let removed = 0;
    for (const account of rows) {
      const outcome = await this.syncAccountRow(account);
      if (outcome.ok) {
        succeeded += 1;
        imported += outcome.imported;
        updated += outcome.updated;
        removed += outcome.removed;
      } else {
        failed += 1;
      }
    }
    return {
      accounts: rows.length,
      succeeded,
      failed,
      imported,
      updated,
      removed,
    };
  }

  public async syncAllEnabledInBackground(): Promise<{
    accounts: number;
    succeeded: number;
    failed: number;
  }> {
    const rows = await this.accountRepository.find({
      where: { enabled: true },
      order: { createdAt: "ASC" },
    });
    let succeeded = 0;
    let failed = 0;
    for (const account of rows) {
      const outcome = await this.syncAccountRow(account);
      if (outcome.ok) {
        succeeded += 1;
      } else {
        failed += 1;
      }
    }
    return { accounts: rows.length, succeeded, failed };
  }

  public async pushContactToAccount(
    organizationId: string,
    accountId: string,
    contactId: string,
  ): Promise<{ resourceHref: string; externalUid: string }> {
    const account = await this.assertAccount(organizationId, accountId);
    if (!account.writeEnabled) {
      throw new BadRequestException("Bu hesap için yazma kapalı.");
    }
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, organizationId },
    });
    if (!contact) {
      throw new NotFoundException("Kişi bulunamadı.");
    }
    const password = decryptCalendarCredential(
      account.passwordCiphertext,
      this.configService,
    );
    const externalUid =
      contact.externalUid?.trim() || `${contact.id}@posta.lerta.com.tr`;
    const vcard = buildSingleVcard({
      uid: externalUid,
      displayName: contact.displayName,
      email: contact.email,
      phone: contact.phone,
      notes: contact.notes,
    });
    const resourceHref =
      contact.carddavAccountId === accountId && contact.carddavResourceHref
        ? contact.carddavResourceHref
        : joinCalDavResourceUrl(
            account.addressbookUrl,
            `${externalUid.replace(/[@/]/g, "_")}.vcf`,
          );
    const etag = await cardDavPutVcard(
      resourceHref,
      account.username,
      password,
      vcard,
      contact.carddavAccountId === accountId ? contact.carddavEtag : null,
    );
    contact.carddavAccountId = accountId;
    contact.carddavResourceHref = resourceHref;
    contact.externalUid = externalUid;
    if (etag) {
      contact.carddavEtag = etag;
    }
    await this.contactRepository.save(contact);
    return { resourceHref, externalUid };
  }

  public async deleteRemoteForContact(
    contact: MailOrgContactEntity,
  ): Promise<void> {
    if (!contact.carddavAccountId || !contact.carddavResourceHref) {
      return;
    }
    const account = await this.accountRepository.findOne({
      where: {
        id: contact.carddavAccountId,
        organizationId: contact.organizationId,
      },
    });
    if (!account || !account.writeEnabled) {
      return;
    }
    const password = decryptCalendarCredential(
      account.passwordCiphertext,
      this.configService,
    );
    try {
      await calDavDeleteResource(
        contact.carddavResourceHref,
        account.username,
        password,
        contact.carddavEtag,
      );
    } catch {
      // Yerel silme devam etsin.
    }
  }

  private async syncAccountRow(
    account: MailContactCardDavAccountEntity,
  ): Promise<
    | {
        ok: true;
        imported: number;
        updated: number;
        removed: number;
      }
    | { ok: false; error: string }
  > {
    const organizationId = account.organizationId;
    const accountId = account.id;
    try {
      const password = decryptCalendarCredential(
        account.passwordCiphertext,
        this.configService,
      );
      const vcardBlocks = await cardDavAddressbookQuery(
        account.addressbookUrl,
        account.username,
        password,
      );
      const parsed = vcardBlocks.flatMap((block) => parseVcfContacts(block));
      const withUid = parsed.map((row) => ({
        ...row,
        externalUid: row.uid ?? this.syntheticUid(row),
      }));
      const uidSet = new Set(withUid.map((row) => row.externalUid));
      const existing = await this.contactRepository.find({
        where: { organizationId, carddavAccountId: accountId },
      });
      let removed = 0;
      for (const row of existing) {
        if (row.externalUid && !uidSet.has(row.externalUid)) {
          await this.contactRepository.remove(row);
          removed += 1;
        }
      }
      let imported = 0;
      let updated = 0;
      for (const row of withUid) {
        const externalUid = row.externalUid;
        const found = await this.contactRepository.findOne({
          where: {
            organizationId,
            carddavAccountId: accountId,
            externalUid,
          },
        });
        if (found) {
          found.displayName = row.displayName;
          found.email = row.email;
          found.phone = row.phone;
          found.notes = row.notes;
          await this.contactRepository.save(found);
          updated += 1;
        } else {
          await this.contactRepository.save(
            this.contactRepository.create({
              organizationId,
              displayName: row.displayName,
              email: row.email,
              phone: row.phone,
              notes: row.notes,
              carddavAccountId: accountId,
              externalUid,
              carddavResourceHref: null,
            }),
          );
          imported += 1;
        }
      }
      account.lastSyncedAt = new Date();
      account.lastSyncError = null;
      await this.accountRepository.save(account);
      return { ok: true, imported, updated, removed };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "CardDAV senkron başarısız.";
      account.lastSyncError = message.slice(0, 500);
      await this.accountRepository.save(account);
      return { ok: false, error: message };
    }
  }

  private syntheticUid(row: {
    displayName: string;
    email: string | null;
  }): string {
    const base = `${row.displayName}|${row.email ?? ""}`.toLowerCase();
    return `syn-${createHash("sha256").update(base).digest("hex").slice(0, 32)}`;
  }

  private normalizeAddressbookUrl(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.length < 12) {
      throw new BadRequestException("Geçersiz adres defteri URL.");
    }
    const url = this.assertSafeHttpsUrl(trimmed);
    return url.toString().endsWith("/") ? url.toString() : `${url.toString()}/`;
  }

  private assertSafeHttpsUrl(raw: string): URL {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new BadRequestException("Geçersiz URL.");
    }
    if (url.protocol !== "https:") {
      throw new BadRequestException("Yalnızca HTTPS CardDAV URL desteklenir.");
    }
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host === "127.0.0.1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      throw new BadRequestException("Bu URL adresine izin verilmiyor.");
    }
    return url;
  }

  private async assertAccount(
    organizationId: string,
    accountId: string,
  ): Promise<MailContactCardDavAccountEntity> {
    const row = await this.accountRepository.findOne({
      where: { id: accountId, organizationId },
    });
    if (!row) {
      throw new NotFoundException("CardDAV hesabı bulunamadı.");
    }
    return row;
  }

  private toDto(
    row: MailContactCardDavAccountEntity,
  ): MailContactCardDavAccountDto {
    return {
      id: row.id,
      label: row.label,
      addressbookUrl: row.addressbookUrl,
      username: row.username,
      enabled: row.enabled,
      writeEnabled: row.writeEnabled,
      lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
      lastSyncError: row.lastSyncError,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
