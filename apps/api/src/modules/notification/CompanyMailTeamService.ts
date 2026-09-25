import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomBytes } from "crypto";
import { Repository } from "typeorm";
import {
  AuthenticatedUserContext,
  AuthenticationException,
  CompanyParticipantTypeCode,
  CompanyRoleCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { CompanyMailTeamInviteEntity } from "../../infrastructure/database/entities/CompanyMailTeamInviteEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { PasswordHashingService } from "../auth/PasswordHashingService";
import { JwtTokenIssuingService } from "../auth/JwtTokenIssuingService";
import { EmailOutboxService } from "./EmailOutboxService";
import { EmailRecipientKind, NotificationEventCode } from "./NotificationEventCode";
import {
  INVITABLE_MAIL_TEAM_ROLES,
  canManageCompanyTeamRoles,
  canManageMailTeam,
} from "./MailCompanyRoleAuthorization";
import { AcceptMailTeamInviteDto } from "./CompanyMailTeamRequestDto";
import {
  MailIdentityAuditAction,
  MailIdentityAuditService,
} from "./MailIdentityAuditService";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class CompanyMailTeamService {
  public constructor(
    @InjectRepository(CompanyMailTeamInviteEntity)
    private readonly inviteRepository: Repository<CompanyMailTeamInviteEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly membershipRepository: Repository<CompanyMembershipEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    private readonly emailOutboxService: EmailOutboxService,
    private readonly passwordHashingService: PasswordHashingService,
    private readonly jwtTokenIssuingService: JwtTokenIssuingService,
    private readonly configService: ConfigService,
    private readonly mailIdentityAuditService: MailIdentityAuditService,
  ) {}

  public async listTeam(companyId: string) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    const memberships = await this.membershipRepository.find({
      where: { companyId },
      relations: { user: true },
      order: { createdAt: "ASC" },
    });
    const members = memberships.map((row) => ({
      membershipId: row.id,
      userId: row.userId,
      emailAddress: row.user.emailAddress,
      displayName: row.user.displayName,
      roleCode: row.roleCode,
      joinedAt: row.createdAt.toISOString(),
    }));
    const invites = await this.inviteRepository.find({
      where: { companyId },
      order: { createdAt: "DESC" },
    });
    const pendingInvites = invites
      .filter(
        (row) =>
          !row.acceptedAt && !row.revokedAt && row.expiresAt > new Date(),
      )
      .map((row) => ({
        inviteId: row.id,
        email: row.email,
        roleCode: row.roleCode,
        expiresAt: row.expiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      }));
    return {
      companyLegalName: company?.legalName ?? "",
      members,
      pendingInvites,
      invitableRoles: INVITABLE_MAIL_TEAM_ROLES,
    };
  }

  public async createInvite(
    actor: AuthenticatedUserContext,
    email: string,
    roleCode: CompanyRoleCode,
  ) {
    if (!canManageMailTeam(actor)) {
      throw new ForbiddenException("Davet göndermek için yetkiniz yok.");
    }
    if (!INVITABLE_MAIL_TEAM_ROLES.includes(roleCode)) {
      throw new BadRequestException("Bu rol davet ile atanamaz.");
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      throw new ValidationException("Geçerli bir e-posta girin.");
    }
    const existingMember = await this.membershipRepository
      .createQueryBuilder("m")
      .innerJoin(UserAccountEntity, "u", "u.id = m.userId")
      .where("m.companyId = :companyId", { companyId: actor.companyId })
      .andWhere("u.emailAddress = :email", { email: normalizedEmail })
      .getOne();
    if (existingMember) {
      throw new BadRequestException("Bu e-posta zaten ekibinizde.");
    }
    const pending = await this.inviteRepository.findOne({
      where: {
        companyId: actor.companyId,
        email: normalizedEmail,
      },
    });
    if (
      pending &&
      !pending.acceptedAt &&
      !pending.revokedAt &&
      pending.expiresAt > new Date()
    ) {
      throw new BadRequestException("Bu adrese zaten bekleyen davet var.");
    }
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    const invite = await this.inviteRepository.save(
      this.inviteRepository.create({
        companyId: actor.companyId,
        email: normalizedEmail,
        roleCode,
        invitedByUserId: actor.userId,
        tokenHash,
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
      }),
    );
    const company = await this.companyRepository.findOne({
      where: { id: actor.companyId },
    });
    const consoleUrl =
      this.configService.get<string>("MAIL_CONSOLE_PUBLIC_URL")?.trim() ||
      "https://yonetim.lerta.com.tr";
    const inviteUrl = `${consoleUrl}/invite?token=${rawToken}`;
    await this.emailOutboxService.enqueue({
      eventCode: NotificationEventCode.MailTeamInvite,
      recipientKind: EmailRecipientKind.User,
      recipientEmail: normalizedEmail,
      locale: "tr",
      payload: {
        companyLegalName: company?.legalName ?? "Firmanız",
        inviteUrl,
        roleLabel: this.roleLabelTr(roleCode),
      },
      idempotencyKey: `MAIL_TEAM_INVITE:${invite.id}`,
      metadata: { companyId: actor.companyId },
    });
    await this.mailIdentityAuditService.recordFromUser(
      actor,
      MailIdentityAuditAction.TeamInviteCreated,
      {
        organizationId: actor.companyId,
        email: normalizedEmail,
        roleCode,
        inviteId: invite.id,
      },
      "/company/mail-identity/team/invites",
    );
    return this.listTeam(actor.companyId);
  }

  public async revokeInvite(actor: AuthenticatedUserContext, inviteId: string) {
    if (!canManageMailTeam(actor)) {
      throw new ForbiddenException("Davet iptali için yetkiniz yok.");
    }
    const invite = await this.inviteRepository.findOne({
      where: { id: inviteId, companyId: actor.companyId },
    });
    if (!invite) {
      throw new NotFoundException("Davet bulunamadı.");
    }
    if (invite.acceptedAt) {
      throw new BadRequestException("Davet zaten kullanılmış.");
    }
    invite.revokedAt = new Date();
    await this.inviteRepository.save(invite);
    await this.mailIdentityAuditService.recordFromUser(
      actor,
      MailIdentityAuditAction.TeamInviteRevoked,
      {
        organizationId: actor.companyId,
        email: invite.email,
        inviteId: invite.id,
      },
      `/company/mail-identity/team/invites/${inviteId}`,
    );
    return this.listTeam(actor.companyId);
  }

  public async updateMemberRole(
    actor: AuthenticatedUserContext,
    membershipId: string,
    roleCode: CompanyRoleCode,
  ) {
    if (!canManageCompanyTeamRoles(actor)) {
      throw new ForbiddenException(
        "Rol değişikliği yalnızca firma sahibi tarafından yapılabilir.",
      );
    }
    if (roleCode === CompanyRoleCode.CompanyOwner) {
      throw new BadRequestException(
        "Firma sahibi rolü davet veya düzenleme ile atanamaz.",
      );
    }
    if (!INVITABLE_MAIL_TEAM_ROLES.includes(roleCode)) {
      throw new BadRequestException("Geçersiz rol.");
    }
    const membership = await this.membershipRepository.findOne({
      where: { id: membershipId, companyId: actor.companyId },
      relations: { user: true },
    });
    if (!membership) {
      throw new NotFoundException("Üyelik bulunamadı.");
    }
    if (membership.roleCode === CompanyRoleCode.CompanyOwner) {
      throw new BadRequestException("Firma sahibinin rolü değiştirilemez.");
    }
    const previousRole = membership.roleCode;
    membership.roleCode = roleCode;
    await this.membershipRepository.save(membership);
    await this.mailIdentityAuditService.recordFromUser(
      actor,
      MailIdentityAuditAction.TeamMemberRoleChanged,
      {
        organizationId: actor.companyId,
        membershipId,
        email: membership.user.emailAddress,
        roleCode,
        previousRoleCode: previousRole,
      },
      `/company/mail-identity/team/members/${membershipId}/role`,
    );
    return this.listTeam(actor.companyId);
  }

  public async removeMember(
    actor: AuthenticatedUserContext,
    membershipId: string,
  ) {
    if (!canManageCompanyTeamRoles(actor)) {
      throw new ForbiddenException(
        "Üye çıkarma yalnızca firma sahibi tarafından yapılabilir.",
      );
    }
    const membership = await this.membershipRepository.findOne({
      where: { id: membershipId, companyId: actor.companyId },
      relations: { user: true },
    });
    if (!membership) {
      throw new NotFoundException("Üyelik bulunamadı.");
    }
    if (membership.userId === actor.userId) {
      throw new BadRequestException("Kendinizi ekibden çıkaramazsınız.");
    }
    if (membership.roleCode === CompanyRoleCode.CompanyOwner) {
      throw new BadRequestException("Firma sahibi çıkarılamaz.");
    }
    const ownerCount = await this.membershipRepository.count({
      where: {
        companyId: actor.companyId,
        roleCode: CompanyRoleCode.CompanyOwner,
      },
    });
    if (ownerCount < 1) {
      throw new BadRequestException("Firma sahibi bulunamadı.");
    }
    await this.membershipRepository.remove(membership);
    await this.mailIdentityAuditService.recordFromUser(
      actor,
      MailIdentityAuditAction.TeamMemberRemoved,
      {
        organizationId: actor.companyId,
        membershipId,
        email: membership.user.emailAddress,
        roleCode: membership.roleCode,
      },
      `/company/mail-identity/team/members/${membershipId}`,
    );
    return this.listTeam(actor.companyId);
  }

  public async previewInvite(rawToken: string) {
    const invite = await this.findActiveInvite(rawToken);
    const company = await this.companyRepository.findOne({
      where: { id: invite.companyId },
    });
    const existingUser = await this.userAccountRepository.findOne({
      where: { emailAddress: invite.email },
    });
    return {
      companyLegalName: company?.legalName ?? "",
      email: invite.email,
      roleCode: invite.roleCode,
      roleLabel: this.roleLabelTr(invite.roleCode as CompanyRoleCode),
      expiresAt: invite.expiresAt.toISOString(),
      requiresPassword: true,
      requiresRegistration: !existingUser,
    };
  }

  public async acceptInvite(
    body: AcceptMailTeamInviteDto,
  ): Promise<{ accessToken: string }> {
    const invite = await this.findActiveInvite(body.token);
    const password = body.password?.trim() ?? "";
    if (!password) {
      throw new ValidationException("Şifre gerekli.");
    }
    const existingUser = await this.userAccountRepository.findOne({
      where: { emailAddress: invite.email },
    });
    let user: UserAccountEntity;
    if (existingUser) {
      const valid = await this.passwordHashingService.verifyPassword(
        password,
        existingUser.passwordHash,
      );
      if (!valid) {
        throw new AuthenticationException("Geçersiz şifre.");
      }
      user = existingUser;
    } else {
      const displayName =
        body.displayName?.trim() ||
        invite.email.split("@")[0] ||
        "Kullanıcı";
      const passwordHash = await this.passwordHashingService.hashPassword(
        password,
      );
      user = await this.userAccountRepository.save(
        this.userAccountRepository.create({
          emailAddress: invite.email,
          passwordHash,
          displayName,
        }),
      );
    }
    const existingMembership = await this.membershipRepository.findOne({
      where: { companyId: invite.companyId, userId: user.id },
    });
    if (!existingMembership) {
      await this.membershipRepository.save(
        this.membershipRepository.create({
          companyId: invite.companyId,
          userId: user.id,
          roleCode: invite.roleCode,
        }),
      );
    }
    invite.acceptedAt = new Date();
    await this.inviteRepository.save(invite);
    const company = await this.companyRepository.findOne({
      where: { id: invite.companyId },
    });
    await this.mailIdentityAuditService.record({
      actorUserId: user.id,
      actorCompanyId: invite.companyId,
      actionCode: MailIdentityAuditAction.TeamInviteAccepted,
      metadata: {
        organizationId: invite.companyId,
        email: invite.email,
        roleCode: invite.roleCode,
        inviteId: invite.id,
      },
      requestPath: "/auth/mail-team-invite/accept",
      httpMethod: "USER_ACTION",
    });
    const context = new AuthenticatedUserContext({
      userId: user.id,
      companyId: invite.companyId,
      emailAddress: user.emailAddress,
      roleCodes: [invite.roleCode as CompanyRoleCode],
      companyParticipantTypeCode:
        (company?.participantTypeCode as CompanyParticipantTypeCode | null) ??
        null,
    });
    return {
      accessToken: this.jwtTokenIssuingService.issueAccessToken(context),
    };
  }

  private async findActiveInvite(
    rawToken: string,
  ): Promise<CompanyMailTeamInviteEntity> {
    const tokenHash = this.hashToken(rawToken.trim());
    const invite = await this.inviteRepository.findOne({
      where: { tokenHash },
    });
    if (
      !invite ||
      invite.revokedAt ||
      invite.acceptedAt ||
      invite.expiresAt < new Date()
    ) {
      throw new ValidationException("Davet geçersiz veya süresi dolmuş.");
    }
    return invite;
  }

  private hashToken(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  private roleLabelTr(roleCode: CompanyRoleCode): string {
    switch (roleCode) {
      case CompanyRoleCode.MailAdmin:
        return "Posta yöneticisi";
      case CompanyRoleCode.BillingAdmin:
        return "Faturalama yöneticisi";
      case CompanyRoleCode.Viewer:
        return "Salt okunur";
      case CompanyRoleCode.CompanyOwner:
        return "Firma sahibi";
      default:
        return roleCode;
    }
  }
}
