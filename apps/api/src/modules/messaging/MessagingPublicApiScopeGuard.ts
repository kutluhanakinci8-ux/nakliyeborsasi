import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { MessagingPublicApiAuthService } from "./MessagingPublicApiAuthService";
import type { MessagingPublicApiRequestContext } from "./MessagingPublicApiAuthService";

export const MESSAGING_PUBLIC_API_SCOPE_KEY = "messaging_public_api_scope";

@Injectable()
export class MessagingPublicApiScopeGuard implements CanActivate {
  public constructor(
    private readonly messagingPublicApiAuthService: MessagingPublicApiAuthService,
    private readonly reflector: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredScope =
      this.reflector.get<string>(
        MESSAGING_PUBLIC_API_SCOPE_KEY,
        context.getHandler(),
      ) ?? "messaging:read";
    const request = context.switchToHttp().getRequest<Request>();
    const header =
      request.header("authorization")?.replace(/^Bearer\s+/i, "") ??
      request.header("x-lerta-mail-api-key") ??
      request.header("x-lerta-messaging-bot-token") ??
      "";
    if (!header.trim()) {
      throw new UnauthorizedException("API anahtarı veya bot token gerekli.");
    }
    const auth = await this.messagingPublicApiAuthService.authenticate(
      header.trim(),
      requiredScope,
    );
    if (!auth) {
      throw new UnauthorizedException("Geçersiz kimlik bilgisi veya scope.");
    }
    if (!auth.scopes.includes(requiredScope)) {
      throw new ForbiddenException(`Gerekli scope: ${requiredScope}`);
    }
    (
      request as Request & {
        messagingPublicApi?: MessagingPublicApiRequestContext;
      }
    ).messagingPublicApi = auth;
    return true;
  }
}
