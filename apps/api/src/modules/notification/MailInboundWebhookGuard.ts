import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class MailInboundWebhookGuard implements CanActivate {
  public constructor(private readonly configService: ConfigService) {}

  public canActivate(context: ExecutionContext): boolean {
    const expected = this.configService
      .get<string>("MAIL_INBOUND_WEBHOOK_SECRET")
      ?.trim();
    if (!expected) {
      throw new UnauthorizedException(
        "MAIL_INBOUND_WEBHOOK_SECRET tanımlı değil — inbound kapalı.",
      );
    }
    const request = context.switchToHttp().getRequest<Request>();
    const header =
      request.header("x-lerta-inbound-secret") ??
      request.header("x-mail-inbound-secret") ??
      request.header("authorization")?.replace(/^Bearer\s+/i, "");
    if (!header || header !== expected) {
      throw new UnauthorizedException("Invalid inbound webhook secret");
    }
    return true;
  }
}
