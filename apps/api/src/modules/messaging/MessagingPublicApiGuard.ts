import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { MailOrganizationIntegrationService } from "../notification/MailOrganizationIntegrationService";

export type MessagingPublicApiRequestContext = {
  companyId: string;
  apiKeyId: string;
  scopes: string[];
};

@Injectable()
export class MessagingPublicApiGuard implements CanActivate {
  public constructor(
    private readonly mailOrganizationIntegrationService: MailOrganizationIntegrationService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header =
      request.header("authorization")?.replace(/^Bearer\s+/i, "") ??
      request.header("x-lerta-mail-api-key") ??
      "";
    if (!header.trim()) {
      throw new UnauthorizedException("API anahtarı gerekli.");
    }
    const auth =
      await this.mailOrganizationIntegrationService.authenticateApiKey(
        header.trim(),
      );
    if (!auth) {
      throw new UnauthorizedException("Geçersiz veya iptal edilmiş API anahtarı.");
    }
    if (!auth.scopes.includes("messaging:read")) {
      throw new ForbiddenException(
        "API anahtarı messaging:read kapsamına sahip değil.",
      );
    }
    (
      request as Request & {
        messagingPublicApi?: MessagingPublicApiRequestContext;
      }
    ).messagingPublicApi = {
      companyId: auth.organizationId,
      apiKeyId: auth.apiKeyId,
      scopes: auth.scopes,
    };
    return true;
  }
}
