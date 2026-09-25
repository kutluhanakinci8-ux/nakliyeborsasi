import { ForbiddenException } from "@nestjs/common";
import { AuthenticatedUserContext, CompanyRoleCode } from "@nakliyeborsasi/core";

const MAIL_CONSOLE_ROLES: readonly CompanyRoleCode[] = [
  CompanyRoleCode.CompanyOwner,
  CompanyRoleCode.MailAdmin,
  CompanyRoleCode.BillingAdmin,
  CompanyRoleCode.Viewer,
];

export function assertMailConsoleAccess(user: AuthenticatedUserContext): void {
  if (!canAccessMailConsole(user)) {
    throw new ForbiddenException(
      "Lerta Mail yönetim konsoluna erişim yetkiniz yok.",
    );
  }
}

export function canAccessMailConsole(user: AuthenticatedUserContext): boolean {
  return user.roleCodes.some((role) =>
    MAIL_CONSOLE_ROLES.includes(role as CompanyRoleCode),
  );
}

export function canManageMailTeam(user: AuthenticatedUserContext): boolean {
  return (
    user.roleCodes.includes(CompanyRoleCode.CompanyOwner) ||
    user.roleCodes.includes(CompanyRoleCode.MailAdmin)
  );
}

export function canManageCompanyTeamRoles(
  user: AuthenticatedUserContext,
): boolean {
  return user.roleCodes.includes(CompanyRoleCode.CompanyOwner);
}

export function canManageMailIdentity(user: AuthenticatedUserContext): boolean {
  return canManageMailTeam(user);
}

export function canManageMailDomain(user: AuthenticatedUserContext): boolean {
  return user.roleCodes.includes(CompanyRoleCode.CompanyOwner);
}

export function canManageMailInboxWrite(
  user: AuthenticatedUserContext,
): boolean {
  return canManageMailIdentity(user);
}

export function isMailReadOnly(user: AuthenticatedUserContext): boolean {
  if (canManageMailIdentity(user)) {
    return false;
  }
  if (user.roleCodes.includes(CompanyRoleCode.BillingAdmin)) {
    return true;
  }
  return user.roleCodes.includes(CompanyRoleCode.Viewer);
}

export const INVITABLE_MAIL_TEAM_ROLES: readonly CompanyRoleCode[] = [
  CompanyRoleCode.MailAdmin,
  CompanyRoleCode.BillingAdmin,
  CompanyRoleCode.Viewer,
];
