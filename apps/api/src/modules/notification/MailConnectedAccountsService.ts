import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { resolveMailSenderAddresses } from "@nakliyeborsasi/core";
import { MailConnectedInboxEntitlementEntity } from "../../infrastructure/database/entities/MailConnectedInboxEntitlementEntity";
import { MailExchangeSyncAccountEntity } from "../../infrastructure/database/entities/MailExchangeSyncAccountEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import {
  MailInboxActor,
  MailMailboxAccessService,
} from "./MailMailboxAccessService";

export type MailConnectedAccountProvider =
  | "lerta"
  | "microsoft_graph"
  | "gmail_api";

export type MailConnectedAccountDto = {
  id: string;
  provider: MailConnectedAccountProvider;
  emailAddress: string;
  displayName: string | null;
  mailboxId: string | null;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
};

export type MailConnectedInboxEntitlementDto = {
  premiumEnabled: boolean;
  maxConnectedAccounts: number;
  connectedCount: number;
};

@Injectable()
export class MailConnectedAccountsService {
  public constructor(
    @InjectRepository(MailConnectedInboxEntitlementEntity)
    private readonly entitlementRepository: Repository<MailConnectedInboxEntitlementEntity>,
    @InjectRepository(MailExchangeSyncAccountEntity)
    private readonly exchangeRepository: Repository<MailExchangeSyncAccountEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    private readonly mailMailboxAccessService: MailMailboxAccessService,
  ) {}

  public async getEntitlement(
    organizationId: string,
    actor?: MailInboxActor,
  ): Promise<MailConnectedInboxEntitlementDto> {
    let row = await this.entitlementRepository.findOne({
      where: { organizationId },
    });
    if (!row) {
      row = await this.entitlementRepository.save(
        this.entitlementRepository.create({
          organizationId,
          premiumEnabled: true,
          maxConnectedAccounts: 10,
        }),
      );
    }
    const accounts = await this.listAccounts(organizationId, actor);
    const connectedCount = accounts.filter((a) => a.provider !== "lerta").length;
    return {
      premiumEnabled: row.premiumEnabled,
      maxConnectedAccounts: row.maxConnectedAccounts,
      connectedCount,
    };
  }

  public async listAccounts(
    organizationId: string,
    actor?: MailInboxActor,
  ): Promise<MailConnectedAccountDto[]> {
    const accounts: MailConnectedAccountDto[] = [];
    const primary = await this.resolvePrimaryLertaAccount(organizationId);
    if (primary) {
      accounts.push(primary);
    }
    const exchangeRows = await this.exchangeRepository.find({
      where: { organizationId },
      order: { createdAt: "DESC" },
    });
    const accessibleMailboxIds = actor
      ? new Set(
          await this.mailMailboxAccessService.resolveAccessibleMailboxIds({
            companyId: organizationId,
            userId: actor.userId,
            roleCodes: actor.roleCodes,
          }),
        )
      : null;
    for (const row of exchangeRows) {
      if (
        accessibleMailboxIds &&
        row.mailboxId &&
        !accessibleMailboxIds.has(row.mailboxId)
      ) {
        continue;
      }
      accounts.push({
        id: row.id,
        provider: "microsoft_graph",
        emailAddress: row.emailAddress,
        displayName: row.displayName,
        mailboxId: row.mailboxId,
        enabled: row.enabled,
        lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
        lastSyncError: row.lastSyncError,
      });
    }
    return accounts;
  }

  public async canAddConnectedAccount(organizationId: string): Promise<boolean> {
    const ent = await this.getEntitlement(organizationId);
    if (!ent.premiumEnabled) {
      return false;
    }
    return ent.connectedCount < ent.maxConnectedAccounts;
  }

  private async resolvePrimaryLertaAccount(
    organizationId: string,
  ): Promise<MailConnectedAccountDto | null> {
    const sender = await this.senderRepository.findOne({
      where: { organizationId, isDefault: true },
      relations: { mailDomain: true },
    });
    if (!sender?.mailDomain) {
      return null;
    }
    const addresses = resolveMailSenderAddresses(
      sender.localPart,
      sender.mailDomain,
    );
    const mailbox = await this.mailboxRepository.findOne({
      where: {
        organizationId,
        emailAddress: addresses.technicalAddress,
      },
    });
    return {
      id: "lerta-primary",
      provider: "lerta",
      emailAddress: addresses.publicAddress,
      displayName: "Lerta posta kutusu",
      mailboxId: mailbox?.id ?? null,
      enabled: true,
      lastSyncedAt: null,
      lastSyncError: null,
    };
  }
}
