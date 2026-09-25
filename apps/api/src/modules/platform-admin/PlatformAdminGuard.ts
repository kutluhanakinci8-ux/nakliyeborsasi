import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import {
  AuthenticatedUserContext,
  AuthorizationException,
  isPlatformOperatorEmail,
} from "@nakliyeborsasi/core";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUserContext;
    }>();
    const user = request.user;
    if (!user?.emailAddress) {
      throw new AuthorizationException("Authentication required");
    }
    if (this.isAllowedOperator(user.emailAddress)) {
      return true;
    }
    throw new AuthorizationException("Platform operator access required");
  }

  private isAllowedOperator(emailAddress: string): boolean {
    if (isPlatformOperatorEmail(emailAddress)) {
      return true;
    }
    const extra = process.env.PLATFORM_OPERATOR_EMAILS?.trim();
    if (!extra) {
      return false;
    }
    const normalized = emailAddress.trim().toLowerCase();
    return extra
      .split(/[,;\s]+/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean)
      .includes(normalized);
  }
}
