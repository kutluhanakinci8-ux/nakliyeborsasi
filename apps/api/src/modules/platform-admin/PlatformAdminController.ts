import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { PlatformAdminGuard } from "./PlatformAdminGuard";
import { PlatformAdminApplicationService } from "./PlatformAdminApplicationService";

@Controller("platform-admin")
@UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
export class PlatformAdminController {
  public constructor(
    private readonly platformAdminApplicationService: PlatformAdminApplicationService,
  ) {}

  @Get("overview")
  public async overview() {
    return {
      overview: await this.platformAdminApplicationService.getOverview(),
    };
  }

  @Get("companies")
  public async companies() {
    return {
      companies: await this.platformAdminApplicationService.listCompanies(),
    };
  }

  @Get("users")
  public async users() {
    return {
      users: await this.platformAdminApplicationService.listUsers(),
    };
  }

  @Get("listings")
  public async listings() {
    return {
      listings: await this.platformAdminApplicationService.listListings(),
    };
  }

  @Get("auctions")
  public async auctions() {
    return {
      auctions: await this.platformAdminApplicationService.listAuctions(),
    };
  }

  @Get("subscriptions")
  public async subscriptions() {
    return {
      subscriptions:
        await this.platformAdminApplicationService.listSubscriptions(),
      plans: this.platformAdminApplicationService.listPlanCatalog(),
    };
  }

  @Get("trust-reviews")
  public async trustReviews() {
    return {
      reviews: await this.platformAdminApplicationService.listTrustReviews(),
    };
  }

  @Get("audit-logs")
  public async auditLogs() {
    return {
      logs: await this.platformAdminApplicationService.listAuditLogs(),
    };
  }

  @Get("message-threads")
  public async messageThreads() {
    return {
      threads: await this.platformAdminApplicationService.listMessageThreads(),
    };
  }

  @Get("message-threads/export")
  public async exportMessageThreads() {
    return {
      export:
        await this.platformAdminApplicationService.exportMessagingEdiscovery(),
    };
  }

  @Get("message-threads/export.zip")
  public async exportMessageThreadsZip(@Res() response: Response): Promise<void> {
    const packageBody =
      await this.platformAdminApplicationService.exportMessagingEdiscoveryZip();
    response.setHeader("Content-Type", "application/zip");
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="messaging-ediscovery.zip"',
    );
    response.setHeader("X-Export-Sha256", packageBody.sha256);
    response.setHeader("X-Export-Generated-At", packageBody.exportedAt);
    response.send(packageBody.zipBuffer);
  }

  @Post("message-threads/:threadId/legal-hold/enable")
  public async enableThreadLegalHold(@Param("threadId") threadId: string) {
    return this.platformAdminApplicationService.enableThreadLegalHold(threadId);
  }

  @Post("message-threads/:threadId/legal-hold/release")
  public async releaseThreadLegalHold(@Param("threadId") threadId: string) {
    return this.platformAdminApplicationService.releaseThreadLegalHold(threadId);
  }

  @Get("messaging-audit-logs")
  public async messagingAuditLogs() {
    return {
      logs:
        await this.platformAdminApplicationService.listMessagingCrudAuditLogs(),
    };
  }
}
