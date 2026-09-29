import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { randomBytes, randomUUID } from "node:crypto";
import {
  AuthenticatedUserContext,
  AuthorizationException,
  CompanyRoleCode,
} from "@nakliyeborsasi/core";
import { CompanyMessagingBotCredentialEntity } from "../../infrastructure/database/entities/CompanyMessagingBotCredentialEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { hashIntegrationSecret } from "../notification/MailIntegrationCrypto";

export type MessagingBotAuthContext = {
  companyId: string;
  botId: string;
  botUserId: string;
  scopes: string[];
};

@Injectable()
export class MessagingBotService {
  public constructor(
    @InjectRepository(CompanyMessagingBotCredentialEntity)
    private readonly botRepository: Repository<CompanyMessagingBotCredentialEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userRepository: Repository<UserAccountEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly membershipRepository: Repository<CompanyMembershipEntity>,
  ) {}

  public async listBots(companyId: string) {
    const rows = await this.botRepository.find({
      where: { companyId, revokedAt: IsNull() },
      order: { createdAt: "DESC" },
    });
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      botUserId: row.botUserId,
      tokenPrefix: row.tokenPrefix,
      scopes: row.scopes,
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  public async createBot(
    authenticatedUser: AuthenticatedUserContext,
    label: string,
  ) {
    this.assertOwner(authenticatedUser);
    const email = `messaging-bot+${randomUUID()}@bots.lerta.internal`;
    const user = await this.userRepository.save(
      this.userRepository.create({
        emailAddress: email,
        displayName: label.trim().slice(0, 80) || "Messaging Bot",
        passwordHash: randomBytes(32).toString("hex"),
        preferredLocale: "tr",
        emailVerifiedAt: new Date(),
      }),
    );
    const botUserId = user.id;
    await this.membershipRepository.save(
      this.membershipRepository.create({
        companyId: authenticatedUser.companyId,
        userId: botUserId,
        roleCode: "VIEWER",
      }),
    );
    const plaintext = this.generateBotToken();
    const prefix = plaintext.slice(0, 20);
    const row = await this.botRepository.save(
      this.botRepository.create({
        companyId: authenticatedUser.companyId,
        label: label.trim().slice(0, 80) || "Bot",
        botUserId,
        tokenPrefix: prefix,
        tokenHash: hashIntegrationSecret(plaintext),
        scopes: ["messaging:read", "messaging:write"],
        lastUsedAt: null,
        revokedAt: null,
      }),
    );
    return {
      bot: {
        id: row.id,
        label: row.label,
        botUserId: row.botUserId,
        tokenPrefix: row.tokenPrefix,
        scopes: row.scopes,
        createdAt: row.createdAt.toISOString(),
      },
      token: plaintext,
    };
  }

  public async revokeBot(
    authenticatedUser: AuthenticatedUserContext,
    botId: string,
  ): Promise<boolean> {
    this.assertOwner(authenticatedUser);
    const row = await this.botRepository.findOne({
      where: { id: botId, companyId: authenticatedUser.companyId, revokedAt: IsNull() },
    });
    if (!row) {
      return false;
    }
    row.revokedAt = new Date();
    await this.botRepository.save(row);
    return true;
  }

  public async authenticateToken(
    plaintext: string,
  ): Promise<MessagingBotAuthContext | null> {
    const trimmed = plaintext.trim();
    if (!trimmed.startsWith("lerta_msg_bot_live_")) {
      return null;
    }
    const hash = hashIntegrationSecret(trimmed);
    const row = await this.botRepository.findOne({
      where: { tokenHash: hash, revokedAt: IsNull() },
    });
    if (!row) {
      return null;
    }
    row.lastUsedAt = new Date();
    await this.botRepository.save(row);
    return {
      companyId: row.companyId,
      botId: row.id,
      botUserId: row.botUserId,
      scopes: row.scopes,
    };
  }

  private generateBotToken(): string {
    return `lerta_msg_bot_live_${randomBytes(24).toString("base64url")}`;
  }

  private assertOwner(authenticatedUser: AuthenticatedUserContext): void {
    if (!authenticatedUser.roleCodes.includes(CompanyRoleCode.CompanyOwner)) {
      throw new AuthorizationException("Bot yönetimi firma yöneticisi gerektirir.");
    }
  }
}
