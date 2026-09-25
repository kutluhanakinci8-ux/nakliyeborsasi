import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
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
import { MailComposeDraftService } from "./MailComposeDraftService";
import { MailComposePresetService } from "./MailComposePresetService";
import { SaveMailDraftRequestDto } from "./SaveMailDraftRequestDto";
import { SaveMailComposePresetRequestDto } from "./SaveMailComposePresetRequestDto";
import { UpdateMailComposePresetRequestDto } from "./UpdateMailComposePresetRequestDto";
import {
  assertMailConsoleAccess,
  canManageMailInboxWrite,
} from "./MailCompanyRoleAuthorization";

@Controller("company/mail-inbox")
@UseGuards(JwtAuthenticationGuard)
export class CompanyMailInboxController {
  public constructor(
    private readonly mailOrganizationInboxService: MailOrganizationInboxService,
    private readonly mailMailboxComposeService: MailMailboxComposeService,
    private readonly mailImapAccessService: MailImapAccessService,
    private readonly mailComposeDraftService: MailComposeDraftService,
    private readonly mailComposePresetService: MailComposePresetService,
  ) {}

  @Get("compose-presets")
  public async listComposePresets(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    return this.mailComposePresetService.listForUser(
      user.companyId,
      user.userId,
    );
  }

  @Post("compose-presets")
  public async createComposePreset(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: SaveMailComposePresetRequestDto,
  ) {
    const preset = await this.mailComposePresetService.create(
      user.companyId,
      user.userId,
      {
        kind: body.kind,
        name: body.name,
        subject: body.subject,
        bodyText: body.bodyText,
        isDefault: body.isDefault,
      },
      canManageMailInboxWrite(user),
    );
    return { preset };
  }

  @Patch("compose-presets/:presetId")
  public async updateComposePreset(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("presetId") presetId: string,
    @Body() body: UpdateMailComposePresetRequestDto,
  ) {
    const preset = await this.mailComposePresetService.update(
      user.companyId,
      user.userId,
      presetId,
      body,
      canManageMailInboxWrite(user),
    );
    return { preset };
  }

  @Delete("compose-presets/:presetId")
  public async deleteComposePreset(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("presetId") presetId: string,
  ) {
    await this.mailComposePresetService.delete(
      user.companyId,
      user.userId,
      presetId,
      canManageMailInboxWrite(user),
    );
    return { ok: true };
  }

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
    this.assertMailInboxWriter(user);
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

  @Get("threads")
  public async listThreads(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("folder") folder?: string,
  ) {
    const resolvedFolder = this.parseFolder(folder);
    const threads = await this.mailOrganizationInboxService.listConversationThreads(
      user.companyId,
      resolvedFolder,
    );
    return { threads, folder: resolvedFolder };
  }

  @Get("threads/:threadId/messages")
  public async listThreadMessages(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
    @Query("folder") folder?: string,
  ) {
    const resolvedFolder = this.parseFolder(folder);
    const messages = await this.mailOrganizationInboxService.listThreadMessages(
      user.companyId,
      threadId,
      resolvedFolder,
    );
    return { threadId, messages, folder: resolvedFolder };
  }

  @Get("search")
  public async search(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("q") query?: string,
    @Query("folder") folder?: string,
    @Query("from") fromAddress?: string,
    @Query("receivedAfter") receivedAfter?: string,
    @Query("receivedBefore") receivedBefore?: string,
    @Query("hasAttachment") hasAttachment?: string,
  ) {
    const resolvedFolder = this.parseFolder(folder);
    const attachmentFilter = this.parseHasAttachmentFilter(hasAttachment);
    const messages = await this.mailOrganizationInboxService.searchMessages(
      user.companyId,
      resolvedFolder,
      {
        q: query ?? "",
        fromAddress: fromAddress?.trim() || undefined,
        receivedAfter: this.parseSearchDateStart(receivedAfter),
        receivedBefore: this.parseSearchDateEnd(receivedBefore),
        hasAttachment: attachmentFilter,
      },
    );
    return {
      messages,
      folder: resolvedFolder,
      q: (query ?? "").trim(),
      from: (fromAddress ?? "").trim(),
      receivedAfter: receivedAfter?.trim() ?? "",
      receivedBefore: receivedBefore?.trim() ?? "",
      hasAttachment: attachmentFilter ?? null,
    };
  }

  @Get("drafts")
  public async listDrafts(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    const drafts = await this.mailComposeDraftService.list(
      user.companyId,
      user.userId,
    );
    return { drafts };
  }

  @Post("drafts")
  public async createDraft(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: SaveMailDraftRequestDto,
  ) {
    const draft = await this.mailComposeDraftService.create(
      user.companyId,
      user.userId,
      body,
    );
    return { draft };
  }

  @Patch("drafts/:draftId")
  public async updateDraft(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("draftId") draftId: string,
    @Body() body: SaveMailDraftRequestDto,
  ) {
    const draft = await this.mailComposeDraftService.update(
      user.companyId,
      user.userId,
      draftId,
      body,
    );
    return { draft };
  }

  @Delete("drafts/:draftId")
  public async deleteDraft(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("draftId") draftId: string,
  ) {
    await this.mailComposeDraftService.delete(
      user.companyId,
      user.userId,
      draftId,
    );
    return { ok: true };
  }

  @Post("drafts/:draftId/send")
  public async sendDraft(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("draftId") draftId: string,
  ) {
    this.assertMailInboxWriter(user);
    const payload = await this.mailComposeDraftService.getForSend(
      user.companyId,
      user.userId,
      draftId,
    );
    const result = await this.mailMailboxComposeService.compose({
      organizationId: user.companyId,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      attachments: payload.attachments,
    });
    await this.mailComposeDraftService.deleteAfterSend(
      user.companyId,
      user.userId,
      draftId,
    );
    return { ok: true, ...result };
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

  @Patch("messages/:messageId/folder")
  public async setMessageFolder(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("messageId") messageId: string,
    @Body() body: { folder?: string },
  ) {
    this.assertMailInboxWriter(user);
    const folder = this.parseMailboxFolder(body.folder);
    const result = await this.mailOrganizationInboxService.setMailboxFolder(
      user.companyId,
      messageId,
      folder,
    );
    return { ok: true, ...result };
  }

  @Delete("messages/:messageId")
  public async deleteMessage(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("messageId") messageId: string,
  ) {
    this.assertMailInboxWriter(user);
    await this.mailOrganizationInboxService.deleteMessagePermanently(
      user.companyId,
      messageId,
    );
    return { ok: true };
  }

  @Post("compose")
  public async compose(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: ComposeMailRequestDto,
  ) {
    this.assertMailInboxWriter(user);
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
    this.assertMailInboxWriter(user);
    const result = await this.mailMailboxComposeService.reply({
      organizationId: user.companyId,
      inboundMessageId: messageId,
      text: body.text,
      attachments: body.attachments,
    });
    return { ok: true, ...result };
  }

  private parseFolder(folder?: string): InboxFolder {
    if (
      folder === "spam" ||
      folder === "all" ||
      folder === "archive" ||
      folder === "trash"
    ) {
      return folder;
    }
    return "inbox";
  }

  private parseSearchDateStart(value?: string): Date | undefined {
    const raw = value?.trim();
    if (!raw) {
      return undefined;
    }
    const parsed = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException("receivedAfter geçersiz");
    }
    return parsed;
  }

  private parseSearchDateEnd(value?: string): Date | undefined {
    const raw = value?.trim();
    if (!raw) {
      return undefined;
    }
    const parsed = new Date(`${raw}T23:59:59.999Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException("receivedBefore geçersiz");
    }
    return parsed;
  }

  private parseHasAttachmentFilter(
    value?: string,
  ): boolean | undefined {
    const raw = value?.trim().toLowerCase();
    if (raw === "true" || raw === "1") {
      return true;
    }
    if (raw === "false" || raw === "0") {
      return false;
    }
    return undefined;
  }

  private parseMailboxFolder(
    folder?: string,
  ): "inbox" | "archive" | "trash" {
    if (folder === "archive" || folder === "trash" || folder === "inbox") {
      return folder;
    }
    throw new BadRequestException("Geçersiz klasör");
  }

  private assertMailInboxWriter(user: AuthenticatedUserContext): void {
    assertMailConsoleAccess(user);
    if (!canManageMailInboxWrite(user)) {
      throw new ForbiddenException(
        "Posta gönderimi yalnızca firma sahibi veya posta yöneticisi tarafından yapılabilir.",
      );
    }
  }
}
