import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { PlatformAdminGuard } from "../platform-admin/PlatformAdminGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import {
  AddMailSupportTicketMessageDto,
  UpdateMailSupportTicketStatusDto,
} from "./MailSupportTicketRequestDto";
import { MailOrganizationSupportTicketService } from "./MailOrganizationSupportTicketService";
import {
  MailIdentityAuditAction,
  MailIdentityAuditService,
} from "./MailIdentityAuditService";

@Controller("platform-admin/mail/support/tickets")
@UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
export class PlatformMailSupportTicketController {
  public constructor(
    private readonly mailOrganizationSupportTicketService: MailOrganizationSupportTicketService,
    private readonly mailIdentityAuditService: MailIdentityAuditService,
  ) {}

  @Get()
  public async list() {
    const tickets =
      await this.mailOrganizationSupportTicketService.listForOperator();
    return { message: "OK", tickets };
  }

  @Get(":ticketId")
  public async getOne(@Param("ticketId") ticketId: string) {
    const ticket =
      await this.mailOrganizationSupportTicketService.getForOperator(ticketId);
    return { message: "OK", ticket };
  }

  @Post(":ticketId/messages")
  public async addStaffMessage(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("ticketId") ticketId: string,
    @Body() body: AddMailSupportTicketMessageDto,
  ) {
    const ticket =
      await this.mailOrganizationSupportTicketService.addStaffMessage({
        ticketId,
        staffUserId: user.userId,
        message: body.message,
      });
    await this.mailIdentityAuditService.record({
      actorUserId: user.userId,
      actorCompanyId: user.companyId,
      actionCode: MailIdentityAuditAction.SupportTicketStaffReply,
      metadata: { ticketId, organizationId: ticket.organizationId },
      requestPath: `/platform-admin/mail/support/tickets/${ticketId}/messages`,
    });
    return { message: "OK", ticket };
  }

  @Patch(":ticketId/status")
  public async updateStatus(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("ticketId") ticketId: string,
    @Body() body: UpdateMailSupportTicketStatusDto,
  ) {
    const ticket =
      await this.mailOrganizationSupportTicketService.updateStatusForOperator({
        ticketId,
        status: body.status,
      });
    await this.mailIdentityAuditService.record({
      actorUserId: user.userId,
      actorCompanyId: user.companyId,
      actionCode: MailIdentityAuditAction.SupportTicketStatusUpdated,
      metadata: {
        ticketId,
        organizationId: ticket.organizationId,
        status: body.status,
      },
      requestPath: `/platform-admin/mail/support/tickets/${ticketId}/status`,
    });
    return { message: "OK", ticket };
  }
}
