import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { MailPublicApiRequestContext } from "./MailPublicApiGuard";

export const MailPublicApiContextParam = createParamDecorator(
  (_data: unknown, context: ExecutionContext): MailPublicApiRequestContext => {
    const request = context.switchToHttp().getRequest<Request>();
    const ctx = (request as Request & { mailPublicApi?: MailPublicApiRequestContext })
      .mailPublicApi;
    if (!ctx) {
      throw new Error("MailPublicApiGuard required");
    }
    return ctx;
  },
);
