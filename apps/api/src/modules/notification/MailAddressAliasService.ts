import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { MailAddressAliasEntity } from "../../infrastructure/database/entities/MailAddressAliasEntity";
import { MailAddressAliasTargetEntity } from "../../infrastructure/database/entities/MailAddressAliasTargetEntity";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";

const MAX_TARGETS_PER_ALIAS = 5;
const MAX_ALIASES_PER_ORG = 25;

@Injectable()
export class MailAddressAliasService {
  public constructor(
    @InjectRepository(MailAddressAliasEntity)
    private readonly aliasRepository: Repository<MailAddressAliasEntity>,
    @InjectRepository(MailAddressAliasTargetEntity)
    private readonly targetRepository: Repository<MailAddressAliasTargetEntity>,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
  ) {}

  public async listAliases(organizationId: string) {
    const rows = await this.aliasRepository.find({
      where: { organizationId },
      order: { createdAt: "ASC" },
    });
    const targets = rows.length
      ? await this.targetRepository.find({
          where: { aliasId: In(rows.map((r) => r.id)) },
        })
      : [];
    const mailboxIds = [...new Set(targets.map((t) => t.mailboxId))];
    const mailboxes = mailboxIds.length
      ? await this.mailboxRepository.find({ where: { id: In(mailboxIds) } })
      : [];
    const mailboxById = new Map(mailboxes.map((m) => [m.id, m]));
    const targetsByAlias = new Map<string, MailAddressAliasTargetEntity[]>();
    for (const target of targets) {
      const list = targetsByAlias.get(target.aliasId) ?? [];
      list.push(target);
      targetsByAlias.set(target.aliasId, list);
    }
    return rows.map((row) => ({
      id: row.id,
      aliasEmail: row.aliasEmail,
      localPart: row.localPart,
      label: row.label,
      targets: (targetsByAlias.get(row.id) ?? []).map((t) => ({
        mailboxId: t.mailboxId,
        emailAddress: mailboxById.get(t.mailboxId)?.emailAddress ?? "—",
      })),
      createdAt: row.createdAt.toISOString(),
    }));
  }

  public async createAlias(
    organizationId: string,
    params: {
      mailDomainId: string;
      localPart: string;
      mailboxIds: string[];
      label?: string;
    },
  ) {
    await this.mailSaasSubscriptionService.assertCustomDomainAllowed(
      organizationId,
    );
    const count = await this.aliasRepository.count({
      where: { organizationId },
    });
    if (count >= MAX_ALIASES_PER_ORG) {
      throw new ForbiddenException(
        `Alias limiti doldu (en fazla ${MAX_ALIASES_PER_ORG}).`,
      );
    }
    const domain = await this.domainRepository.findOne({
      where: {
        id: params.mailDomainId,
        organizationId,
        verificationStatus: "verified",
      },
    });
    if (!domain) {
      throw new NotFoundException("Doğrulanmış domain bulunamadı.");
    }
    const localPart = params.localPart.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{0,62}$/.test(localPart)) {
      throw new BadRequestException("Geçersiz alias yerel kısım.");
    }
    const aliasEmail = `${localPart}@${domain.domain}`.toLowerCase();
    const existingMailbox = await this.mailboxRepository.findOne({
      where: { emailAddress: aliasEmail },
    });
    if (existingMailbox) {
      throw new BadRequestException(
        "Bu adres zaten bir posta kutusu olarak kayıtlı.",
      );
    }
    const existingSender = await this.senderRepository.findOne({
      where: { mailDomainId: domain.id, localPart },
    });
    if (existingSender) {
      throw new BadRequestException(
        "Bu adres zaten bir gönderen kimliği. Alias için farklı bir yerel kısım seçin.",
      );
    }
    const existingAlias = await this.aliasRepository.findOne({
      where: { aliasEmail },
    });
    if (existingAlias) {
      throw new BadRequestException("Bu alias zaten tanımlı.");
    }
    const mailboxIds = [...new Set(params.mailboxIds)];
    if (!mailboxIds.length || mailboxIds.length > MAX_TARGETS_PER_ALIAS) {
      throw new BadRequestException(
        `1–${MAX_TARGETS_PER_ALIAS} posta kutusu seçin.`,
      );
    }
    const mailboxes = await this.mailboxRepository.find({
      where: { id: In(mailboxIds), organizationId },
    });
    if (mailboxes.length !== mailboxIds.length) {
      throw new BadRequestException("Geçersiz posta kutusu seçimi.");
    }
    const alias = await this.aliasRepository.save(
      this.aliasRepository.create({
        organizationId,
        mailDomainId: domain.id,
        aliasEmail,
        localPart,
        label: params.label?.trim().slice(0, 120) ?? null,
      }),
    );
    await this.targetRepository.save(
      mailboxIds.map((mailboxId) =>
        this.targetRepository.create({ aliasId: alias.id, mailboxId }),
      ),
    );
    return this.listAliases(organizationId).then((list) =>
      list.find((row) => row.id === alias.id),
    );
  }

  public async deleteAlias(
    organizationId: string,
    aliasId: string,
  ): Promise<boolean> {
    const alias = await this.aliasRepository.findOne({
      where: { id: aliasId, organizationId },
    });
    if (!alias) {
      return false;
    }
    await this.targetRepository.delete({ aliasId: alias.id });
    await this.aliasRepository.delete({ id: alias.id });
    return true;
  }

  public async resolveMailboxesForRecipient(
    recipient: string,
  ): Promise<MailMailboxEntity[] | null> {
    const normalized = recipient.trim().toLowerCase();
    const alias = await this.aliasRepository.findOne({
      where: { aliasEmail: normalized },
    });
    if (!alias) {
      return null;
    }
    const targets = await this.targetRepository.find({
      where: { aliasId: alias.id },
    });
    if (!targets.length) {
      return null;
    }
    const mailboxes = await this.mailboxRepository.find({
      where: { id: In(targets.map((t) => t.mailboxId)), status: "active" },
    });
    return mailboxes.length ? mailboxes : null;
  }

  public async listAliasEmailsForRouting(): Promise<
    { aliasEmail: string; organizationId: string; domain: string }[]
  > {
    const rows = await this.aliasRepository.find();
    if (!rows.length) {
      return [];
    }
    const domains = await this.domainRepository.find({
      where: { id: In([...new Set(rows.map((r) => r.mailDomainId))]) },
    });
    const domainById = new Map(domains.map((d) => [d.id, d]));
    return rows
      .map((row) => {
        const domain = domainById.get(row.mailDomainId);
        if (!domain || domain.verificationStatus !== "verified") {
          return null;
        }
        return {
          aliasEmail: row.aliasEmail,
          organizationId: row.organizationId,
          domain: domain.domain,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }
}
