import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { MailZstdJsonResponseInterceptor } from "../../common/MailZstdJsonResponseInterceptor";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { MailConsoleAccessGuard } from "./MailConsoleAccessGuard";
import {
  MailIdentityAuditAction,
  MailIdentityAuditService,
} from "./MailIdentityAuditService";
import {
  AddMailSupportTicketMessageDto,
  CreateMailSupportTicketDto,
} from "./MailSupportTicketRequestDto";
import { MailOrganizationSupportTicketService } from "./MailOrganizationSupportTicketService";

@Controller("company/mail-identity/support/tickets")
@UseGuards(JwtAuthenticationGuard, MailConsoleAccessGuard)
@UseInterceptors(MailZstdJsonResponseInterceptor)
export class CompanyMailSupportTicketController {
  public constructor(
    private readonly mailOrganizationSupportTicketService: MailOrganizationSupportTicketService,
    private readonly mailIdentityAuditService: MailIdentityAuditService,
  ) {}

  @Get()
  public async list(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    const tickets =
      await this.mailOrganizationSupportTicketService.listForOrganization(
        user.companyId,
      );
    return { message: "OK", tickets };
  }

  @Post()
  public async create(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: CreateMailSupportTicketDto,
  ) {
    const ticket = await this.mailOrganizationSupportTicketService.create({
      organizationId: user.companyId,
      userId: user.userId,
      topic: body.topic,
      subject: body.subject,
      message: body.message,
      domain: body.domain,
    });
    await this.mailIdentityAuditService.recordFromUser(
      user,
      MailIdentityAuditAction.SupportTicketCreated,
      { ticketId: ticket.id, topic: body.topic },
      "/company/mail-identity/support/tickets",
    );
    return { message: "OK", ticket };
  }

  @Get(":ticketId")
  public async getOne(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("ticketId") ticketId: string,
  ) {
    const ticket = await this.mailOrganizationSupportTicketService.getForOrganization(
      user.companyId,
      ticketId,
    );
    return { message: "OK", ticket };
  }

  @Post(":ticketId/messages")
  public async addMessage(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("ticketId") ticketId: string,
    @Body() body: AddMailSupportTicketMessageDto,
  ) {
    const ticket = await this.mailOrganizationSupportTicketService.addCustomerMessage({
      organizationId: user.companyId,
      userId: user.userId,
      ticketId,
      message: body.message,
    });
    await this.mailIdentityAuditService.recordFromUser(
      user,
      MailIdentityAuditAction.SupportTicketCustomerReply,
      { ticketId },
      `/company/mail-identity/support/tickets/${ticketId}/messages`,
    );
    return { message: "OK", ticket };
  }
}
