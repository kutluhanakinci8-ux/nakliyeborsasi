import {
  PLATFORM_DEFAULT_SMTP_FROM,
  PLATFORM_PRIMARY_CONTACT_EMAIL,
} from "@nakliyeborsasi/core";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class NotificationConfigurationService {
  public constructor(private readonly configService: ConfigService) {}

  public isEmailEnabled(): boolean {
    const flag = this.configService.get<string>("EMAIL_ENABLED");
    if (flag === "false") {
      return false;
    }
    return true;
  }

  public resolveDefaultAdminRecipients(): string[] {
    const raw =
      this.configService.get<string>("PLATFORM_ADMIN_EMAILS") ??
      PLATFORM_PRIMARY_CONTACT_EMAIL;
    return raw
      .split(/[,;]/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }

  public resolveSmtpConfig(): {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from: string;
  } {
    const host =
      this.configService.get<string>("SMTP_HOST") ?? "127.0.0.1";
    const port = Number(this.configService.get<string>("SMTP_PORT") ?? "1025");
    const secure = this.configService.get<string>("SMTP_SECURE") === "true";
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASS");
    const from =
      this.configService.get<string>("SMTP_FROM") ??
      PLATFORM_DEFAULT_SMTP_FROM;
    return { host, port, secure, user, pass, from };
  }

  public resolveWebBaseUrl(): string {
    return (
      this.configService.get<string>("WEB_PUBLIC_BASE_URL") ??
      "http://localhost:3011"
    );
  }
}
