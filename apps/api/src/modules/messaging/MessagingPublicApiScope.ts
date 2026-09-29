import { SetMetadata } from "@nestjs/common";
import { MESSAGING_PUBLIC_API_SCOPE_KEY } from "./MessagingPublicApiScopeGuard";

export const MessagingPublicApiScope = (scope: string) =>
  SetMetadata(MESSAGING_PUBLIC_API_SCOPE_KEY, scope);
