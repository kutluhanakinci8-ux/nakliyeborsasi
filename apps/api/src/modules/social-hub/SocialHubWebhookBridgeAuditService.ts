import { Injectable } from "@nestjs/common";
import {
  SocialHubAuditActionCode,
  SocialHubAuditService,
} from "./SocialHubAuditService";
import { isWebhookBridgeAuditEnabled } from "./socialHubIntegrationOpsHints";

@Injectable()
export class SocialHubWebhookBridgeAuditService {
  public constructor(private readonly auditService: SocialHubAuditService) {}

  public recordInboundBridged(params: {
    companyId: string;
    platformCode: string;
    threadId?: string;
    externalThreadId: string;
    externalMessageId: string | null;
  }): void {
    if (!isWebhookBridgeAuditEnabled()) {
      return;
    }
    this.auditService.recordCompanySystemEvent(
      params.companyId,
      SocialHubAuditActionCode.WebhookInboundBridged,
      `/company/social-hub/webhooks/${params.platformCode.toLowerCase()}`,
      {
        platformCode: params.platformCode,
        threadId: params.threadId ?? null,
        externalThreadId: params.externalThreadId,
        externalMessageId: params.externalMessageId,
      },
    );
  }
}
