import {
  AuthenticatedUserContext,
  AuthorizationException,
  CompanyRoleCode,
} from "@nakliyeborsasi/core";

export type SocialHubAccessLevel = "read" | "inbox" | "publish" | "admin";

function hasAnyRole(
  user: AuthenticatedUserContext,
  roles: CompanyRoleCode[],
): boolean {
  return roles.some((role) => user.roleCodes.includes(role));
}

export function assertSocialHubRead(user: AuthenticatedUserContext): void {
  if (
    hasAnyRole(user, [
      CompanyRoleCode.CompanyOwner,
      CompanyRoleCode.SocialAdmin,
      CompanyRoleCode.Dispatcher,
      CompanyRoleCode.Viewer,
    ])
  ) {
    return;
  }
  throw new AuthorizationException("Social hub read access required");
}

export function assertSocialHubAdmin(user: AuthenticatedUserContext): void {
  if (
    hasAnyRole(user, [
      CompanyRoleCode.CompanyOwner,
      CompanyRoleCode.SocialAdmin,
    ])
  ) {
    return;
  }
  throw new AuthorizationException("Social hub admin access required");
}

export function canSocialHubPublish(
  user: AuthenticatedUserContext,
  settings: {
    dispatcherCanPublish: boolean;
    ownerApprovalRequired: boolean;
  },
): boolean {
  if (hasAnyRole(user, [CompanyRoleCode.CompanyOwner, CompanyRoleCode.SocialAdmin])) {
    return true;
  }
  if (
    user.roleCodes.includes(CompanyRoleCode.Dispatcher) &&
    settings.dispatcherCanPublish &&
    !settings.ownerApprovalRequired
  ) {
    return true;
  }
  return false;
}

export function canSocialHubReply(
  user: AuthenticatedUserContext,
  settings: { dispatcherCanReply: boolean },
): boolean {
  if (hasAnyRole(user, [CompanyRoleCode.CompanyOwner, CompanyRoleCode.SocialAdmin])) {
    return true;
  }
  return (
    user.roleCodes.includes(CompanyRoleCode.Dispatcher) &&
    settings.dispatcherCanReply
  );
}

export function canSocialHubApprovePosts(
  user: AuthenticatedUserContext,
): boolean {
  return hasAnyRole(user, [
    CompanyRoleCode.CompanyOwner,
    CompanyRoleCode.SocialAdmin,
  ]);
}

export function resolveSocialHubPermissions(
  user: AuthenticatedUserContext,
  settings: {
    dispatcherCanPublish: boolean;
    dispatcherCanReply: boolean;
    ownerApprovalRequired: boolean;
  },
): {
  canManageConnections: boolean;
  canPublish: boolean;
  canApprovePosts: boolean;
  canSubmitForApproval: boolean;
  canReply: boolean;
  canManageTemplates: boolean;
  canManageSettings: boolean;
} {
  const isAdmin = hasAnyRole(user, [
    CompanyRoleCode.CompanyOwner,
    CompanyRoleCode.SocialAdmin,
  ]);
  const isDispatcher = user.roleCodes.includes(CompanyRoleCode.Dispatcher);
  return {
    canManageConnections: isAdmin,
    canPublish: canSocialHubPublish(user, settings),
    canApprovePosts: isAdmin,
    canSubmitForApproval:
      settings.ownerApprovalRequired &&
      (isDispatcher || isAdmin) &&
      !canSocialHubPublish(user, settings),
    canReply: canSocialHubReply(user, settings),
    canManageTemplates: isAdmin,
    canManageSettings: isAdmin,
  };
}
