import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  AuthenticatedUserContext,
  AuthorizationException,
  CompanyRoleCode,
} from "@nakliyeborsasi/core";

export class CompanyRolesMetadataKey {
  public static readonly metadataKey = "company_role_codes";
}

export const RequireCompanyRoles = (
  ...roleCodes: CompanyRoleCode[]
): ReturnType<typeof SetMetadata> =>
  SetMetadata(CompanyRolesMetadataKey.metadataKey, roleCodes);

@Injectable()
export class CompanyRolesAuthorizationGuard implements CanActivate {
  public constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<CompanyRoleCode[]>(
        CompanyRolesMetadataKey.metadataKey,
        [context.getHandler(), context.getClass()],
      ) ?? [];
    if (requiredRoles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedUserContext;
    }>();
    const authenticatedUser = request.user;
    if (!authenticatedUser) {
      throw new AuthorizationException("Authentication required");
    }
    const hasRole = requiredRoles.some((role) =>
      authenticatedUser.roleCodes.includes(role),
    );
    if (!hasRole) {
      throw new AuthorizationException("Insufficient company role");
    }
    return true;
  }
}
