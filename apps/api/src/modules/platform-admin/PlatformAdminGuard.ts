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
    if (!isPlatformOperatorEmail(user.emailAddress)) {
      throw new AuthorizationException("Platform operator access required");
    }
    return true;
  }
}
