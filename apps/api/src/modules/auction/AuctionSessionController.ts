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
import {
  AuctionSessionDetailResponse,
  AuctionSessionLiveSnapshotResponse,
} from "./AuctionSessionDetailMapper";
import { AuctionListingPriceActionService } from "./AuctionListingPriceActionService";
import { FreightListingPriceOfferRequestDto } from "./FreightListingPriceOfferRequestDto";

@Controller("auctions")
@UseGuards(JwtAuthenticationGuard)
export class AuctionSessionController {
  public constructor(
    private readonly auctionSessionApplicationService: AuctionSessionApplicationService,
    private readonly auctionListingPriceActionService: AuctionListingPriceActionService,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  @Get("sessions")
  public async listSessions(
    @Query() query: AuctionSessionListQueryDto,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ): Promise<{ sessions: unknown[] }> {
    const statusFilter = query.status ?? "open";
    const sessions = await this.auctionSessionApplicationService.listSessions(
      authenticatedUser,
      statusFilter,
    );
    return { sessions };
  }

  @Get("sessions/:auctionSessionId/live")
  public async getSessionLive(
    @Param("auctionSessionId") auctionSessionId: string,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<AuctionSessionLiveSnapshotResponse> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    return this.auctionSessionApplicationService.getSessionLiveSnapshot(
      authenticatedUser,
      auctionSessionId,
      locale,
    );
  }

  @Post("listings/:freightListingId/fixed-accept")
  public async acceptFixedListingPrice(
    @Param("freightListingId") freightListingId: string,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ sessionId: string; bidId: string }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    return this.auctionListingPriceActionService.acceptListingFixedPrice(
      authenticatedUser,
      freightListingId,
      locale,
    );
  }

  @Post("listings/:freightListingId/price-offer")
  public async sendListingPriceOffer(
    @Param("freightListingId") freightListingId: string,
    @Body() body: FreightListingPriceOfferRequestDto,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ threadId: string; messageId: string }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    return this.auctionListingPriceActionService.sendMessengerPriceOffer(
      authenticatedUser,
      freightListingId,
      body,
      locale,
    );
  }

  @Get("sessions/:auctionSessionId")
  public async getSession(
    @Param("auctionSessionId") auctionSessionId: string,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<AuctionSessionDetailResponse> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    return this.auctionSessionApplicationService.getSessionDetail(
      authenticatedUser,
      auctionSessionId,
      locale,
    );
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
