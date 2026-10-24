import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  AuthenticatedUserContext,
  CompanyRoleCode,
} from "@nakliyeborsasi/core";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailMailboxDelegateEntity } from "../../infrastructure/database/entities/MailMailboxDelegateEntity";
import { canManageMailIdentity } from "./MailCompanyRoleAuthorization";

export type MailInboxActor = Pick<
  AuthenticatedUserContext,
  "userId" | "roleCodes" | "companyId"
>;

@Injectable()
export class MailMailboxAccessService {
  public constructor(
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailMailboxDelegateEntity)
    private readonly delegateRepository: Repository<MailMailboxDelegateEntity>,
  ) {}

  public async allMailboxIdsForOrganization(
    organizationId: string,
  ): Promise<string[]> {
    const mailboxes = await this.mailboxRepository.find({
      where: { organizationId },
      select: { id: true },
    });
    return mailboxes.map((m) => m.id);
  }

  public async resolveAccessibleMailboxIds(
    actor: MailInboxActor,
  ): Promise<string[]> {
    const mailboxes = await this.mailboxRepository.find({
      where: { organizationId: actor.companyId },
    });
    if (mailboxes.length === 0) {
      return [];
    }
    if (canManageMailIdentity(actor as AuthenticatedUserContext)) {
      return mailboxes.map((m) => m.id);
    }
    const delegateRows = await this.delegateRepository.find({
      where: { delegateUserId: actor.userId },
    });
    const delegateByMailbox = new Map(
      delegateRows.map((row) => [row.mailboxId, row.permission]),
    );
    const allowed: string[] = [];
    for (const mailbox of mailboxes) {
      if (mailbox.accessMode === "organization") {
        allowed.push(mailbox.id);
        continue;
      }
      if (mailbox.ownerUserId === actor.userId) {
        allowed.push(mailbox.id);
        continue;
      }
      if (delegateByMailbox.has(mailbox.id)) {
        allowed.push(mailbox.id);
      }
    }
    return allowed;
  }

  public async canAccessMailbox(
    actor: MailInboxActor,
    mailboxId: string,
  ): Promise<boolean> {
    const ids = await this.resolveAccessibleMailboxIds(actor);
    return ids.includes(mailboxId);
  }

  public async canSendFromMailbox(
    actor: MailInboxActor,
    mailboxId: string,
  ): Promise<boolean> {
    if (canManageMailIdentity(actor as AuthenticatedUserContext)) {
      const mailbox = await this.mailboxRepository.findOne({
        where: { id: mailboxId, organizationId: actor.companyId },
      });
      return Boolean(mailbox);
    }
    const mailbox = await this.mailboxRepository.findOne({
      where: { id: mailboxId, organizationId: actor.companyId },
    });
    if (!mailbox) {
      return false;
    }
    if (mailbox.accessMode === "organization") {
      if (this.isReadOnlyRole(actor)) {
        return false;
      }
      return (
        actor.roleCodes.includes(CompanyRoleCode.CompanyOwner) ||
        actor.roleCodes.includes(CompanyRoleCode.MailAdmin)
      );
    }
    if (mailbox.ownerUserId === actor.userId) {
      return !this.isReadOnlyRole(actor);
    }
    const delegate = await this.delegateRepository.findOne({
      where: { mailboxId, delegateUserId: actor.userId },
    });
    if (!delegate) {
      return false;
    }
    return (
      !this.isReadOnlyRole(actor) &&
      (delegate.permission === "send" || delegate.permission === "manage")
    );
  }

  private isReadOnlyRole(actor: MailInboxActor): boolean {
    if (actor.roleCodes.includes(CompanyRoleCode.Viewer)) {
      return true;
    }
    if (actor.roleCodes.includes(CompanyRoleCode.BillingAdmin)) {
      return true;
    }
    return false;
  }

  public async listDelegateGrantsForUser(
    actor: MailInboxActor,
  ): Promise<MailMailboxDelegateEntity[]> {
    return this.delegateRepository.find({
      where: { delegateUserId: actor.userId },
    });
  }

  public async listDelegatesForMailbox(mailboxId: string) {
    return this.delegateRepository.find({
      where: { mailboxId },
      order: { createdAt: "ASC" },
    });
  }

  public async mailboxIdsForDelegateUserIds(
    userIds: string[],
  ): Promise<Map<string, string[]>> {
    if (userIds.length === 0) {
      return new Map();
    }
    const rows = await this.delegateRepository.find({
      where: { delegateUserId: In(userIds) },
    });
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.delegateUserId) ?? [];
      list.push(row.mailboxId);
      map.set(row.delegateUserId, list);
    }
    return map;
  }
}
