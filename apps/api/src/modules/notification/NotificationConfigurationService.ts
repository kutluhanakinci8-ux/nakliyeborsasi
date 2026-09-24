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

  public resolveSmtpProfile(): string {
    const raw = this.configService.get<string>("SMTP_PROFILE")?.trim().toLowerCase();
    if (raw === "mailpit" || raw === "custom") {
      return raw;
    }
    const host = this.configService.get<string>("SMTP_HOST") ?? "";
    if (host === "127.0.0.1" || host === "localhost") {
      return "mailpit";
    }
    return "custom";
  }

  public resolveDeliveryMode(): "mailpit" | "custom" {
    const profile = this.resolveSmtpProfile();
    if (profile === "mailpit") {
      return "mailpit";
    }
    return "custom";
  }

  public resolveSmtpConfig(): {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from: string;
  } {
    const profile = this.resolveSmtpProfile();
    const from =
      this.configService.get<string>("SMTP_FROM") ??
      PLATFORM_DEFAULT_SMTP_FROM;

    const host =
      this.configService.get<string>("SMTP_HOST") ??
      (profile === "mailpit" ? "127.0.0.1" : "127.0.0.1");
    const port = Number(
      this.configService.get<string>("SMTP_PORT") ??
        (profile === "mailpit" ? "1025" : "587"),
    );
    const secure = this.configService.get<string>("SMTP_SECURE") === "true";
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASS");
    return { host, port, secure, user, pass, from };
  }

  public resolveWebBaseUrl(): string {
    return (
      this.configService.get<string>("WEB_PUBLIC_BASE_URL") ??
      "http://localhost:3011"
    );
  }

  public resolveApiPublicBaseUrl(): string {
    const web = this.resolveWebBaseUrl().replace(/\/$/, "");
    if (web.includes(":3011")) {
      return `${web.replace(":3011", ":3010")}/api/v1`;
    }
    return `${web}/api/v1`;
  }

  public isTrackingDisabled(): boolean {
    return this.configService.get<string>("EMAIL_TRACKING_ENABLED") === "false";
  }
}
