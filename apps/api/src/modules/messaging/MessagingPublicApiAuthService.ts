import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { CompanyRoleCode } from "@nakliyeborsasi/core";
import { MailOrganizationIntegrationService } from "../notification/MailOrganizationIntegrationService";
import { MessagingBotService } from "./MessagingBotService";

export type MessagingPublicApiRequestContext = {
  companyId: string;
  actorUserId: string;
  credentialType: "api_key" | "bot";
  credentialId: string;
  scopes: string[];
};

@Injectable()
export class MessagingPublicApiAuthService {
  public constructor(
    private readonly mailOrganizationIntegrationService: MailOrganizationIntegrationService,
    private readonly messagingBotService: MessagingBotService,
    @InjectRepository(CompanyMembershipEntity)
    private readonly membershipRepository: Repository<CompanyMembershipEntity>,
  ) {}

  public async authenticate(
    rawToken: string,
    requiredScope: string,
  ): Promise<MessagingPublicApiRequestContext | null> {
    const trimmed = rawToken.trim();
    const bot = await this.messagingBotService.authenticateToken(trimmed);
    if (bot) {
      if (!bot.scopes.includes(requiredScope)) {
        return null;
      }
      return {
        companyId: bot.companyId,
        actorUserId: bot.botUserId,
        credentialType: "bot",
        credentialId: bot.botId,
        scopes: bot.scopes,
      };
    }
    const apiKey =
      await this.mailOrganizationIntegrationService.authenticateApiKey(trimmed);
    if (!apiKey || !apiKey.scopes.includes(requiredScope)) {
      return null;
    }
    const actorUserId = await this.resolveApiKeyActorUserId(apiKey.organizationId);
    if (!actorUserId) {
      return null;
    }
    return {
      companyId: apiKey.organizationId,
      actorUserId,
      credentialType: "api_key",
      credentialId: apiKey.apiKeyId,
      scopes: apiKey.scopes,
    };
  }

  private async resolveApiKeyActorUserId(companyId: string): Promise<string | null> {
    const owner = await this.membershipRepository.findOne({
      where: { companyId, roleCode: CompanyRoleCode.CompanyOwner },
    });
    if (owner) {
      return owner.userId;
    }
    const any = await this.membershipRepository.findOne({
      where: { companyId },
    });
    return any?.userId ?? null;
  }
}
