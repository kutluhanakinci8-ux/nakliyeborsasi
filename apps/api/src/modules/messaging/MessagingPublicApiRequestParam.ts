import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { MessagingPublicApiRequestContext } from "./MessagingPublicApiAuthService";

export const MessagingPublicApiContextParam = createParamDecorator(
  (_data: unknown, context: ExecutionContext): MessagingPublicApiRequestContext => {
    const request = context.switchToHttp().getRequest<Request>();
    const ctx = (
      request as Request & { messagingPublicApi?: MessagingPublicApiRequestContext }
    ).messagingPublicApi;
    if (!ctx) {
      throw new Error("MessagingPublicApi context missing");
    }
    return ctx;
  },
);
