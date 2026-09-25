import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { CompanyRoleCode, AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { Response } from "express";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import {
  InboxFolder,
  MailOrganizationInboxService,
} from "./MailOrganizationInboxService";
import { MailMailboxComposeService } from "./MailMailboxComposeService";
import { MailImapAccessService } from "./MailImapAccessService";
import { ComposeMailRequestDto } from "./ComposeMailRequestDto";
import { ReplyMailRequestDto } from "./ReplyMailRequestDto";

@Controller("company/mail-inbox")
@UseGuards(JwtAuthenticationGuard)
export class CompanyMailInboxController {
  public constructor(
    private readonly mailOrganizationInboxService: MailOrganizationInboxService,
    private readonly mailMailboxComposeService: MailMailboxComposeService,
    private readonly mailImapAccessService: MailImapAccessService,
  ) {}

  @Get("imap-settings")
  public async imapSettings(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    return {
      settings: await this.mailImapAccessService.getSettings(user.companyId),
    };
  }

  @Post("imap-credentials/rotate")
  public async rotateImapCredentials(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    this.assertCompanyOwner(user);
    const credentials = await this.mailImapAccessService.rotatePassword(
      user.companyId,
    );
    return { ok: true, credentials };
  }

  @Get()
  public async summary(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("folder") folder?: string,
  ) {
    const resolvedFolder = this.parseFolder(folder);
    const summary = await this.mailOrganizationInboxService.getSummary(
      user.companyId,
    );
    const messages = await this.mailOrganizationInboxService.listMessages(
      user.companyId,
      resolvedFolder,
    );
    const sent = await this.mailMailboxComposeService.listSent(user.companyId);
    return { summary, messages, sent, folder: resolvedFolder };
  }

  @Get("sent/:sentId")
  public async getSentMessage(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("sentId") sentId: string,
  ) {
    const message = await this.mailMailboxComposeService.getSentMessage(
      user.companyId,
      sentId,
    );
    return { message };
  }

  @Get("messages/:messageId")
  public async getMessage(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("messageId") messageId: string,
  ) {
    const message = await this.mailOrganizationInboxService.getMessage(
      user.companyId,
      messageId,
    );
    return { message };
  }

  @Get("messages/:messageId/attachments/:index")
  public async downloadAttachment(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("messageId") messageId: string,
    @Param("index") indexRaw: string,
    @Res() response: Response,
  ): Promise<void> {
    const index = Number.parseInt(indexRaw, 10);
    const { file, buffer } =
      await this.mailOrganizationInboxService.getAttachment(
        user.companyId,
        messageId,
        index,
      );
    response.setHeader("Content-Type", file.contentType);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`,
    );
    response.send(buffer);
  }

  @Patch("messages/:messageId/read")
  public async markRead(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("messageId") messageId: string,
  ) {
    await this.mailOrganizationInboxService.markRead(user.companyId, messageId);
    return { ok: true };
  }

  @Post("compose")
  public async compose(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: ComposeMailRequestDto,
  ) {
    this.assertCompanyOwner(user);
    const result = await this.mailMailboxComposeService.compose({
      organizationId: user.companyId,
      to: body.to,
      subject: body.subject,
      text: body.text,
      attachments: body.attachments,
    });
    return { ok: true, ...result };
  }

  @Post("messages/:messageId/reply")
  public async reply(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("messageId") messageId: string,
    @Body() body: ReplyMailRequestDto,
  ) {
    this.assertCompanyOwner(user);
    const result = await this.mailMailboxComposeService.reply({
      organizationId: user.companyId,
      inboundMessageId: messageId,
      text: body.text,
      attachments: body.attachments,
    });
    return { ok: true, ...result };
  }

  private parseFolder(folder?: string): InboxFolder {
    if (folder === "spam" || folder === "all") {
      return folder;
    }
    return "inbox";
  }

  private assertCompanyOwner(user: AuthenticatedUserContext): void {
    if (!user.roleCodes.includes(CompanyRoleCode.CompanyOwner)) {
      throw new ForbiddenException(
        "Posta gönderimi yalnızca firma sahibi tarafından yapılabilir.",
      );
    }
  }
}
