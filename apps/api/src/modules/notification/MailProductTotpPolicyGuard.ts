import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { MailOrganizationSecurityService } from "./MailOrganizationSecurityService";

/** Webmail (`company/mail-inbox`) — org TOTP policy, no konsol rolü kontrolü. */
@Injectable()
export class MailProductTotpPolicyGuard implements CanActivate {
  public constructor(
    private readonly mailOrganizationSecurityService: MailOrganizationSecurityService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUserContext | undefined;
    if (!user) {
      return false;
    }
    await this.mailOrganizationSecurityService.assertConsoleTotpPolicy(
      user.userId,
      user.companyId,
    );
    return true;
  }
}
