import { Controller, Get, UseGuards } from "@nestjs/common";
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
}
