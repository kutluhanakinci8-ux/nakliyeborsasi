import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { MailOrganizationIntegrationService } from "./MailOrganizationIntegrationService";

export type MailPublicApiRequestContext = {
  organizationId: string;
  apiKeyId: string;
};

@Injectable()
export class MailPublicApiGuard implements CanActivate {
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
    const auth = await this.mailOrganizationIntegrationService.authenticateApiKey(
      header.trim(),
    );
    if (!auth) {
      throw new UnauthorizedException("Geçersiz veya iptal edilmiş API anahtarı.");
    }
    (request as Request & { mailPublicApi?: MailPublicApiRequestContext }).mailPublicApi =
      auth;
    return true;
  }
}
