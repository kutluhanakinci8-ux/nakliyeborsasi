import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";
import { AuctionSessionApplicationService } from "./AuctionSessionApplicationService";
import { CreateAuctionSessionRequestDto } from "./CreateAuctionSessionRequestDto";
import { PlaceAuctionBidRequestDto } from "./PlaceAuctionBidRequestDto";
import { AuctionSessionListQueryDto } from "./AuctionSessionListQueryDto";

@Controller("auctions")
@UseGuards(JwtAuthenticationGuard)
export class AuctionSessionController {
  public constructor(
    private readonly auctionSessionApplicationService: AuctionSessionApplicationService,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  @Get("sessions")
  public async listSessions(
    @Query() query: AuctionSessionListQueryDto,
  ): Promise<{ sessions: unknown[] }> {
    const statusFilter = query.status ?? "open";
    const sessions = await this.auctionSessionApplicationService.listSessions(
      statusFilter,
    );
    return { sessions };
  }

  @Get("sessions/:auctionSessionId")
  public async getSession(
    @Param("auctionSessionId") auctionSessionId: string,
  ): Promise<{ session: unknown }> {
    const session =
      await this.auctionSessionApplicationService.getSessionById(
        auctionSessionId,
      );
    return { session };
  }

  @Post("sessions")
  public async createSession(
    @Body() body: CreateAuctionSessionRequestDto,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ session: unknown }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const session = await this.auctionSessionApplicationService.createSession(
      authenticatedUser,
      body,
      locale,
    );
    return { session };
  }

  @Post("sessions/:auctionSessionId/bids")
  public async placeBid(
    @Param("auctionSessionId") auctionSessionId: string,
    @Body() body: PlaceAuctionBidRequestDto,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ bid: unknown }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const bid = await this.auctionSessionApplicationService.placeBid(
      authenticatedUser,
      auctionSessionId,
      body.bidAmount,
      locale,
    );
    return { bid };
  }
}
