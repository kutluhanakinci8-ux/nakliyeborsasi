import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { MessagingRealtimeHubService } from "./MessagingRealtimeHubService";
import { MessagingStreamTicketService } from "./MessagingStreamTicketService";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";

@Controller("messaging/stream")
export class MessagingStreamController {
  public constructor(
    private readonly ticketService: MessagingStreamTicketService,
    private readonly hubService: MessagingRealtimeHubService,
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
  ) {}

  @Post("ticket")
  @UseGuards(JwtAuthenticationGuard)
  public async createTicket(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("lang") locale = "tr",
  ) {
    await this.messagingThreadApplicationService.assertMessagingModule(
      user,
      locale,
    );
    const ticket = this.ticketService.issue(user.companyId, user.userId);
    return { ticket, expiresInSeconds: 120 };
  }

  @Get()
  public stream(
    @Query("ticket") ticket: string,
    @Res() res: Response,
  ): void {
    const session = this.ticketService.consume(ticket);
    this.hubService.attach(session.companyId, res);
  }
}
