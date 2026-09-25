import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { canAccessMailConsole } from "./MailCompanyRoleAuthorization";
import { MailOrganizationSecurityService } from "./MailOrganizationSecurityService";

@Injectable()
export class MailConsoleAccessGuard implements CanActivate {
  public constructor(
    private readonly mailOrganizationSecurityService: MailOrganizationSecurityService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUserContext | undefined;
    if (!user) {
      return false;
    }
    if (!canAccessMailConsole(user)) {
      throw new ForbiddenException(
        "Lerta Mail yönetim konsoluna erişim yetkiniz yok.",
      );
    }
    const path = `${request.path ?? ""}${request.url ?? ""}`;
    if (path.includes("/company/mail-identity/security")) {
      return true;
    }
    await this.mailOrganizationSecurityService.assertConsoleTotpPolicy(
      user.userId,
      user.companyId,
    );
    return true;
  }
}
