import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import {
  MailMailboxDelegateEntity,
  MailMailboxDelegatePermission,
} from "../../infrastructure/database/entities/MailMailboxDelegateEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { canManageMailIdentity } from "./MailCompanyRoleAuthorization";
import {
  MailIdentityAuditAction,
  MailIdentityAuditService,
} from "./MailIdentityAuditService";

export type MailboxDelegationRow = {
  mailboxId: string;
  emailAddress: string;
  accessMode: "organization" | "delegates_only";
  ownerUserId: string | null;
  ownerEmail: string | null;
  delegates: {
    id: string;
    userId: string;
    emailAddress: string;
    displayName: string | null;
    permission: MailMailboxDelegatePermission;
    createdAt: string;
  }[];
};

@Injectable()
export class MailMailboxDelegationService {
  public constructor(
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailMailboxDelegateEntity)
    private readonly delegateRepository: Repository<MailMailboxDelegateEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly membershipRepository: Repository<CompanyMembershipEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userRepository: Repository<UserAccountEntity>,
    private readonly mailIdentityAuditService: MailIdentityAuditService,
  ) {}

  public async listMailboxDelegations(
    actor: AuthenticatedUserContext,
  ): Promise<{ mailboxes: MailboxDelegationRow[]; canManage: boolean }> {
    const canManage = canManageMailIdentity(actor);
    const mailboxes = await this.mailboxRepository.find({
      where: { organizationId: actor.companyId },
      order: { emailAddress: "ASC" },
    });
    const mailboxIds = mailboxes.map((m) => m.id);
    const delegates = mailboxIds.length
      ? await this.delegateRepository.find({
          where: { mailboxId: In(mailboxIds) },
        })
      : [];
    const delegatedToActor = new Set(
      delegates
        .filter((d) => d.delegateUserId === actor.userId)
        .map((d) => d.mailboxId),
    );
    const visible = canManage
      ? mailboxes
      : mailboxes.filter(
          (m) =>
            m.accessMode === "organization" ||
            m.ownerUserId === actor.userId ||
            delegatedToActor.has(m.id),
        );
    const delegateUserIds = [...new Set(delegates.map((d) => d.delegateUserId))];
    const ownerUserIds = [
      ...new Set(
        mailboxes
          .map((m) => m.ownerUserId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const users = await this.userRepository.find({
      where: [
        ...delegateUserIds.map((id) => ({ id })),
        ...ownerUserIds.map((id) => ({ id })),
      ],
    });
    const userById = new Map(users.map((u) => [u.id, u]));
    const delegatesByMailbox = new Map<string, MailMailboxDelegateEntity[]>();
    for (const row of delegates) {
      const bucket = delegatesByMailbox.get(row.mailboxId) ?? [];
      bucket.push(row);
      delegatesByMailbox.set(row.mailboxId, bucket);
    }

    const rows: MailboxDelegationRow[] = [];
    for (const mailbox of canManage ? mailboxes : visible) {
      const owner = mailbox.ownerUserId
        ? userById.get(mailbox.ownerUserId)
        : null;
      rows.push({
        mailboxId: mailbox.id,
        emailAddress: mailbox.emailAddress,
        accessMode: mailbox.accessMode,
        ownerUserId: mailbox.ownerUserId,
        ownerEmail: owner?.emailAddress ?? null,
        delegates: (delegatesByMailbox.get(mailbox.id) ?? []).map((d) => {
          const user = userById.get(d.delegateUserId);
          return {
            id: d.id,
            userId: d.delegateUserId,
            emailAddress: user?.emailAddress ?? d.delegateUserId,
            displayName: user?.displayName ?? null,
            permission: d.permission,
            createdAt: d.createdAt.toISOString(),
          };
        }),
      });
    }
    return { mailboxes: rows, canManage };
  }

  public async setMailboxAccessMode(
    actor: AuthenticatedUserContext,
    mailboxId: string,
    accessMode: "organization" | "delegates_only",
    ownerUserId?: string | null,
  ): Promise<MailboxDelegationRow> {
    await this.assertCanManageMailbox(actor, mailboxId);
    const mailbox = await this.requireOrgMailbox(actor.companyId, mailboxId);
    mailbox.accessMode = accessMode;
    if (accessMode === "delegates_only") {
      mailbox.ownerUserId = ownerUserId?.trim() || actor.userId;
    } else {
      mailbox.ownerUserId = null;
    }
    await this.mailboxRepository.save(mailbox);
    await this.mailIdentityAuditService.record({
      actorUserId: actor.userId,
      actorCompanyId: actor.companyId,
      actionCode: MailIdentityAuditAction.MailboxAccessModeUpdated,
      metadata: { mailboxId, accessMode, ownerUserId: mailbox.ownerUserId },
    });
    const list = await this.listMailboxDelegations(actor);
    const row = list.mailboxes.find((m) => m.mailboxId === mailboxId);
    if (!row) {
      throw new NotFoundException("Posta kutusu bulunamadı.");
    }
    return row;
  }

  public async addDelegate(
    actor: AuthenticatedUserContext,
    mailboxId: string,
    delegateEmail: string,
    permission: MailMailboxDelegatePermission,
  ): Promise<MailboxDelegationRow> {
    await this.assertCanManageMailbox(actor, mailboxId);
    await this.requireOrgMailbox(actor.companyId, mailboxId);
    const email = delegateEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new BadRequestException("Geçerli bir e-posta adresi girin.");
    }
    const members = await this.membershipRepository.find({
      where: { companyId: actor.companyId },
      relations: { user: true },
    });
    const member = members.find(
      (m) => m.user.emailAddress.toLowerCase() === email,
    );
    if (!member) {
      throw new BadRequestException(
        "Delegasyon yalnızca kurum ekibindeki kullanıcılara verilebilir.",
      );
    }
    if (member.userId === actor.userId && !canManageMailIdentity(actor)) {
      throw new BadRequestException("Kendinize delegasyon ekleyemezsiniz.");
    }
    const existing = await this.delegateRepository.findOne({
      where: { mailboxId, delegateUserId: member.userId },
    });
    if (existing) {
      existing.permission = permission;
      await this.delegateRepository.save(existing);
    } else {
      await this.delegateRepository.save(
        this.delegateRepository.create({
          mailboxId,
          delegateUserId: member.userId,
          permission,
          createdByUserId: actor.userId,
        }),
      );
    }
    await this.mailIdentityAuditService.record({
      actorUserId: actor.userId,
      actorCompanyId: actor.companyId,
      actionCode: MailIdentityAuditAction.MailboxDelegateAdded,
      metadata: { mailboxId, delegateUserId: member.userId, permission },
    });
    const list = await this.listMailboxDelegations(actor);
    const row = list.mailboxes.find((m) => m.mailboxId === mailboxId);
    if (!row) {
      throw new NotFoundException("Posta kutusu bulunamadı.");
    }
    return row;
  }

  public async removeDelegate(
    actor: AuthenticatedUserContext,
    mailboxId: string,
    delegateId: string,
  ): Promise<void> {
    await this.assertCanManageMailbox(actor, mailboxId);
    const delegate = await this.delegateRepository.findOne({
      where: { id: delegateId, mailboxId },
    });
    if (!delegate) {
      throw new NotFoundException("Delegasyon kaydı bulunamadı.");
    }
    await this.delegateRepository.remove(delegate);
    await this.mailIdentityAuditService.record({
      actorUserId: actor.userId,
      actorCompanyId: actor.companyId,
      actionCode: MailIdentityAuditAction.MailboxDelegateRemoved,
      metadata: { mailboxId, delegateUserId: delegate.delegateUserId },
    });
  }

  private async assertCanManageMailbox(
    actor: AuthenticatedUserContext,
    mailboxId: string,
  ): Promise<void> {
    if (canManageMailIdentity(actor)) {
      return;
    }
    const mailbox = await this.mailboxRepository.findOne({
      where: { id: mailboxId, organizationId: actor.companyId },
    });
    if (mailbox?.ownerUserId === actor.userId) {
      return;
    }
    throw new ForbiddenException(
      "Bu posta kutusunun delegasyonunu yönetemezsiniz.",
    );
  }

  private async requireOrgMailbox(
    organizationId: string,
    mailboxId: string,
  ): Promise<MailMailboxEntity> {
    const mailbox = await this.mailboxRepository.findOne({
      where: { id: mailboxId, organizationId },
    });
    if (!mailbox) {
      throw new NotFoundException("Posta kutusu bulunamadı.");
    }
    return mailbox;
  }
}
