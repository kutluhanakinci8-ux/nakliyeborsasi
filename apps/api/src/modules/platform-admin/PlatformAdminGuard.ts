import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import {
  AuthenticatedUserContext,
  AuthorizationException,
} from "@nakliyeborsasi/core";

const PLATFORM_OPERATOR_EMAILS = new Set(["admin@nakliyeborsasi.local"]);

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
    const email = user.emailAddress.trim().toLowerCase();
    if (!PLATFORM_OPERATOR_EMAILS.has(email)) {
      throw new AuthorizationException("Platform operator access required");
    }
    return true;
  }
}
