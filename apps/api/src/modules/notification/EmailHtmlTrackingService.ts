import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "node:crypto";
import { Repository } from "typeorm";
import { EmailOutboxClickTokenEntity } from "../../infrastructure/database/entities/EmailOutboxClickTokenEntity";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { EmailTrackingSignatureService } from "./EmailTrackingSignatureService";

@Injectable()
export class EmailHtmlTrackingService {
  public constructor(
    private readonly notificationConfigurationService: NotificationConfigurationService,
    private readonly emailTrackingSignatureService: EmailTrackingSignatureService,
    @InjectRepository(EmailOutboxClickTokenEntity)
    private readonly clickTokenRepository: Repository<EmailOutboxClickTokenEntity>,
  ) {}

  public async applyTracking(
    outboxId: string,
    html: string,
  ): Promise<string> {
    if (this.notificationConfigurationService.isTrackingDisabled()) {
      return html;
    }
    const withLinks = await this.rewriteLinks(outboxId, html);
    return this.injectOpenPixel(outboxId, withLinks);
  }

  private resolveApiBase(): string {
    return this.notificationConfigurationService.resolveApiPublicBaseUrl();
  }

  private injectOpenPixel(outboxId: string, html: string): string {
    const token = this.emailTrackingSignatureService.signOpenToken(outboxId);
    const pixelUrl = `${this.resolveApiBase()}/email/track/open/${token}`;
    const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none!important;max-height:0;overflow:hidden" />`;
    if (html.includes("</body>")) {
      return html.replace("</body>", `${pixel}</body>`);
    }
    return `${html}${pixel}`;
  }

  private async rewriteLinks(outboxId: string, html: string): Promise<string> {
    const hrefRegex = /href\s*=\s*"(https?:\/\/[^"]+)"/gi;
    const matches = [...html.matchAll(hrefRegex)];
    if (matches.length === 0) {
      return html;
    }
    let result = html;
    for (const match of matches) {
      const original = match[1];
      if (!original || original.includes("/email/track/")) {
        continue;
      }
      const token = randomBytes(16).toString("hex");
      await this.clickTokenRepository.save(
        this.clickTokenRepository.create({
          token,
          outboxId,
          targetUrl: original,
        }),
      );
      const tracked = `${this.resolveApiBase()}/email/track/click/${token}`;
      result = result.replace(
        `href="${original}"`,
        `href="${tracked}"`,
      );
    }
    return result;
  }
}
