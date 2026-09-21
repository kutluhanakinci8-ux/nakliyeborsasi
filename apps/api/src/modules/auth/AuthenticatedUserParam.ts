import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";

export const AuthenticatedUserParam = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUserContext => {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUserContext }>();
    return request.user;
  },
);
