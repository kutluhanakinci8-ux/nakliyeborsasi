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
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { Response } from "express";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { MailProductTotpPolicyGuard } from "./MailProductTotpPolicyGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import {
  InboxFolder,
  MailOrganizationInboxService,
} from "./MailOrganizationInboxService";
import { MailMailboxComposeService } from "./MailMailboxComposeService";
import { MailImapAccessService } from "./MailImapAccessService";
import { ComposeMailRequestDto } from "./ComposeMailRequestDto";
import { ReplyMailRequestDto } from "./ReplyMailRequestDto";
import { ForwardMailRequestDto } from "./ForwardMailRequestDto";
import { MailComposeDraftService } from "./MailComposeDraftService";
import { MailComposePresetService } from "./MailComposePresetService";
import { MailOrganizationStorageService } from "./MailOrganizationStorageService";
import { SaveMailDraftRequestDto } from "./SaveMailDraftRequestDto";
import { SaveMailComposePresetRequestDto } from "./SaveMailComposePresetRequestDto";
import { UpdateMailComposePresetRequestDto } from "./UpdateMailComposePresetRequestDto";
import {
  assertMailConsoleAccess,
  canManageMailInboxWrite,
} from "./MailCompanyRoleAuthorization";
import {
  BulkMailInboxFolderDto,
  BulkMailInboxStarDto,
  BulkMailInboxIdsDto,
} from "./BulkMailInboxRequestDto";
import { MailOrganizationBrandingService } from "./MailOrganizationBrandingService";
import { SetMessageStarredRequestDto } from "./SetMessageStarredRequestDto";
import { MailWebPushService } from "./MailWebPushService";
import {
  RegisterWebPushSubscriptionRequestDto,
  UnregisterWebPushSubscriptionRequestDto,
} from "./RegisterWebPushSubscriptionRequestDto";
import type { Request } from "express";
import { MailCustomFolderService } from "./MailCustomFolderService";
import {
  BulkSetMessageCustomFolderRequestDto,
  CreateMailCustomFolderRequestDto,
  SetMessageCustomFolderRequestDto,
  UpdateMailCustomFolderRequestDto,
} from "./MailCustomFolderRequestDto";
import { MailInboxRuleService } from "./MailInboxRuleService";
import { MailDelayedComposeService } from "./MailDelayedComposeService";
import { MailInboxPreferencesService } from "./MailInboxPreferencesService";
import { UpdateMailInboxPreferencesRequestDto } from "./MailInboxPreferencesRequestDto";
import {
  CreateMailInboxRuleRequestDto,
  ReorderMailInboxRulesRequestDto,
  UpdateMailInboxRuleRequestDto,
} from "./MailInboxRuleRequestDto";

@Controller("company/mail-inbox")
@UseGuards(JwtAuthenticationGuard, MailProductTotpPolicyGuard)
export class CompanyMailInboxController {
  public constructor(
    private readonly mailOrganizationInboxService: MailOrganizationInboxService,
    private readonly mailMailboxComposeService: MailMailboxComposeService,
    private readonly mailImapAccessService: MailImapAccessService,
    private readonly mailComposeDraftService: MailComposeDraftService,
    private readonly mailComposePresetService: MailComposePresetService,
    private readonly mailOrganizationStorageService: MailOrganizationStorageService,
    private readonly mailOrganizationBrandingService: MailOrganizationBrandingService,
    private readonly mailWebPushService: MailWebPushService,
    private readonly mailCustomFolderService: MailCustomFolderService,
    private readonly mailInboxRuleService: MailInboxRuleService,
    private readonly mailDelayedComposeService: MailDelayedComposeService,
    private readonly mailInboxPreferencesService: MailInboxPreferencesService,
  ) {}

  @Get("preferences")
  public async getInboxPreferences(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    const preferences = await this.mailInboxPreferencesService.get(
      user.companyId,
    );
    return { preferences };
  }

  @Patch("preferences")
  public async updateInboxPreferences(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: UpdateMailInboxPreferencesRequestDto,
  ) {
    this.assertMailInboxWriter(user);
    const preferences = await this.mailInboxPreferencesService.update(
      user.companyId,
      { dailyDigestEnabled: body.dailyDigestEnabled },
    );
    return { preferences };
  }

  @Get("rules")
  public async listInboxRules(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    const rules = await this.mailInboxRuleService.list(user.companyId);
    return { rules };
  }

  @Post("rules")
  public async createInboxRule(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: CreateMailInboxRuleRequestDto,
  ) {
    const rule = await this.mailInboxRuleService.create(user.companyId, {
      name: body.name,
      fromContains: body.fromContains,
      subjectContains: body.subjectContains,
      actionStar: body.actionStar,
      actionCustomFolderId: body.actionCustomFolderId ?? null,
      actionArchive: body.actionArchive,
      enabled: body.enabled,
    });
    return { rule };
  }

  @Post("rules/reorder")
  public async reorderInboxRules(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: ReorderMailInboxRulesRequestDto,
  ) {
    const rules = await this.mailInboxRuleService.reorder(
      user.companyId,
      body.ruleIds,
    );
    return { rules };
  }

  @Patch("rules/:ruleId")
  public async updateInboxRule(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("ruleId") ruleId: string,
    @Body() body: UpdateMailInboxRuleRequestDto,
  ) {
    const rule = await this.mailInboxRuleService.update(user.companyId, ruleId, {
      name: body.name,
      fromContains: body.fromContains,
      subjectContains: body.subjectContains,
      actionStar: body.actionStar,
      actionCustomFolderId: body.actionCustomFolderId,
      actionArchive: body.actionArchive,
      enabled: body.enabled,
    });
    return { rule };
  }

  @Delete("rules/:ruleId")
  public async deleteInboxRule(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("ruleId") ruleId: string,
  ) {
    await this.mailInboxRuleService.remove(user.companyId, ruleId);
    return { ok: true };
  }

  private parseCustomFolderId(
    folder: InboxFolder,
    customFolderId?: string,
  ): string | null | undefined {
    if (folder !== "inbox") {
      return undefined;
    }
    const raw = customFolderId?.trim();
    return raw ? raw : null;
  }

  @Get("push-config")
  public pushConfig() {
    return { config: this.mailWebPushService.getPublicConfig() };
  }

  @Post("push/subscribe")
  public async registerPush(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: RegisterWebPushSubscriptionRequestDto,
    @Req() request: Request,
  ) {
    await this.mailWebPushService.registerSubscription({
      userId: user.userId,
      organizationId: user.companyId,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      userAgent: request.headers["user-agent"] ?? null,
    });
    return { ok: true };
  }

  @Post("push/unsubscribe")
  public async unregisterPush(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: UnregisterWebPushSubscriptionRequestDto,
  ) {
    await this.mailWebPushService.unregisterSubscription(
      user.userId,
      body.endpoint,
    );
    return { ok: true };
  }

  @Get("branding")
  public async branding(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    const branding = await this.mailOrganizationBrandingService.getSnapshot(
      user.companyId,
    );
    return { message: "OK", branding };
  }

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

  @Get("custom-folders")
  public async listCustomFolders(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    const folders = await this.mailCustomFolderService.listForOrganization(
      user.companyId,
    );
    return { folders };
  }

  @Post("custom-folders")
  public async createCustomFolder(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: CreateMailCustomFolderRequestDto,
  ) {
    const folder = await this.mailCustomFolderService.create(
      user.companyId,
      body.name,
    );
    return { folder };
  }

  @Patch("custom-folders/:folderId")
  public async updateCustomFolder(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("folderId") folderId: string,
    @Body() body: UpdateMailCustomFolderRequestDto,
  ) {
    const folder = await this.mailCustomFolderService.updateName(
      user.companyId,
      folderId,
      body.name,
    );
    return { folder };
  }

  @Delete("custom-folders/:folderId")
  public async deleteCustomFolder(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("folderId") folderId: string,
  ) {
    await this.mailCustomFolderService.remove(user.companyId, folderId);
    return { ok: true };
  }

  @Get()
  public async summary(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("folder") folder?: string,
    @Query("customFolderId") customFolderId?: string,
  ) {
    const resolvedFolder = this.parseFolder(folder);
    const resolvedCustomFolderId = this.parseCustomFolderId(
      resolvedFolder,
      customFolderId,
    );
    const summary = await this.mailOrganizationInboxService.getSummary(
      user.companyId,
    );
    const messages = await this.mailOrganizationInboxService.listMessages(
      user.companyId,
      resolvedFolder,
      50,
      resolvedCustomFolderId,
    );
    const sent = await this.mailMailboxComposeService.listSent(user.companyId);
    const storageQuota = await this.mailOrganizationStorageService.getSnapshot(
      user.companyId,
    );
    return {
      summary: { ...summary, storageQuota },
      messages,
      sent,
      folder: resolvedFolder,
    };
  }

  @Get("threads")
  public async listThreads(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("folder") folder?: string,
    @Query("customFolderId") customFolderId?: string,
  ) {
    const resolvedFolder = this.parseFolder(folder);
    const resolvedCustomFolderId = this.parseCustomFolderId(
      resolvedFolder,
      customFolderId,
    );
    const threads = await this.mailOrganizationInboxService.listConversationThreads(
      user.companyId,
      resolvedFolder,
      40,
      resolvedCustomFolderId,
    );
    return { threads, folder: resolvedFolder };
  }

  @Get("threads/:threadId/messages")
  public async listThreadMessages(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
    @Query("folder") folder?: string,
    @Query("customFolderId") customFolderId?: string,
  ) {
    const resolvedFolder = this.parseFolder(folder);
    const resolvedCustomFolderId = this.parseCustomFolderId(
      resolvedFolder,
      customFolderId,
    );
    const messages = await this.mailOrganizationInboxService.listThreadMessages(
      user.companyId,
      threadId,
      resolvedFolder,
      resolvedCustomFolderId,
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
    @Query("customFolderId") customFolderId?: string,
  ) {
    const resolvedFolder = this.parseFolder(folder);
    const resolvedCustomFolderId = this.parseCustomFolderId(
      resolvedFolder,
      customFolderId,
    );
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
      50,
      resolvedCustomFolderId,
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

  @Patch("messages/:messageId/star")
  public async setStarred(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("messageId") messageId: string,
    @Body() body: SetMessageStarredRequestDto,
  ) {
    const result = await this.mailOrganizationInboxService.setStarred(
      user.companyId,
      messageId,
      body.starred,
    );
    return { ok: true, ...result };
  }

  @Patch("messages/:messageId/unread")
  public async markUnread(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("messageId") messageId: string,
  ) {
    await this.mailOrganizationInboxService.markUnread(
      user.companyId,
      messageId,
    );
    return { ok: true };
  }

  @Post("messages/bulk/read")
  public async bulkMarkRead(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: BulkMailInboxIdsDto,
  ) {
    const result = await this.mailOrganizationInboxService.bulkMarkRead(
      user.companyId,
      body.messageIds,
    );
    return { ok: true, ...result };
  }

  @Post("messages/bulk/unread")
  public async bulkMarkUnread(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: BulkMailInboxIdsDto,
  ) {
    const result = await this.mailOrganizationInboxService.bulkMarkUnread(
      user.companyId,
      body.messageIds,
    );
    return { ok: true, ...result };
  }

  @Post("messages/bulk/folder")
  public async bulkSetFolder(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: BulkMailInboxFolderDto,
  ) {
    this.assertMailInboxWriter(user);
    const folder = this.parseMailboxFolder(body.folder);
    const result = await this.mailOrganizationInboxService.bulkSetMailboxFolder(
      user.companyId,
      body.messageIds,
      folder,
    );
    return { ok: true, ...result };
  }

  @Post("messages/bulk/star")
  public async bulkSetStarred(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: BulkMailInboxStarDto,
  ) {
    const result = await this.mailOrganizationInboxService.bulkSetStarred(
      user.companyId,
      body.messageIds,
      body.starred,
    );
    return { ok: true, ...result };
  }

  @Post("messages/bulk/custom-folder")
  public async bulkSetCustomFolder(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: BulkSetMessageCustomFolderRequestDto,
  ) {
    const result = await this.mailCustomFolderService.bulkSetMessageFolder(
      user.companyId,
      body.messageIds,
      body.customFolderId ?? null,
    );
    return { ok: true, ...result };
  }

  @Patch("messages/:messageId/custom-folder")
  public async setMessageCustomFolder(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("messageId") messageId: string,
    @Body() body: SetMessageCustomFolderRequestDto,
  ) {
    await this.mailCustomFolderService.setMessageFolder(
      user.companyId,
      messageId,
      body.customFolderId ?? null,
    );
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
    const payload = {
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      text: body.text,
      html: body.html,
      attachments: body.attachments,
    };
    if (body.delaySeconds && body.delaySeconds > 0) {
      const pending = await this.mailDelayedComposeService.schedule(
        user.companyId,
        { kind: "compose", ...payload },
        body.delaySeconds,
      );
      return {
        ok: true,
        delayed: true,
        pendingId: pending.id,
        sendAt: pending.sendAt,
      };
    }
    const result = await this.mailMailboxComposeService.compose({
      organizationId: user.companyId,
      ...payload,
    });
    return { ok: true, ...result };
  }

  @Post("compose/pending/:pendingId/cancel")
  public async cancelDelayedCompose(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("pendingId") pendingId: string,
  ) {
    this.assertMailInboxWriter(user);
    await this.mailDelayedComposeService.cancel(user.companyId, pendingId);
    return { ok: true };
  }

  @Post("messages/:messageId/reply")
  public async reply(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("messageId") messageId: string,
    @Body() body: ReplyMailRequestDto,
  ) {
    this.assertMailInboxWriter(user);
    if (body.delaySeconds && body.delaySeconds > 0) {
      const pending = await this.mailDelayedComposeService.schedule(
        user.companyId,
        {
          kind: "reply",
          inboundMessageId: messageId,
          text: body.text,
          bcc: body.bcc,
          attachments: body.attachments,
        },
        body.delaySeconds,
      );
      return {
        ok: true,
        delayed: true,
        pendingId: pending.id,
        sendAt: pending.sendAt,
      };
    }
    const result = await this.mailMailboxComposeService.reply({
      organizationId: user.companyId,
      inboundMessageId: messageId,
      text: body.text,
      bcc: body.bcc,
      attachments: body.attachments,
    });
    return { ok: true, ...result };
  }

  @Post("messages/:messageId/forward")
  public async forward(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("messageId") messageId: string,
    @Body() body: ForwardMailRequestDto,
  ) {
    this.assertMailInboxWriter(user);
    if (body.delaySeconds && body.delaySeconds > 0) {
      const pending = await this.mailDelayedComposeService.schedule(
        user.companyId,
        {
          kind: "forward",
          inboundMessageId: messageId,
          to: body.to,
          text: body.text,
          includeOriginal: body.includeOriginal,
          attachments: body.attachments,
        },
        body.delaySeconds,
      );
      return {
        ok: true,
        delayed: true,
        pendingId: pending.id,
        sendAt: pending.sendAt,
      };
    }
    const result = await this.mailMailboxComposeService.forward({
      organizationId: user.companyId,
      inboundMessageId: messageId,
      to: body.to,
      text: body.text,
      includeOriginal: body.includeOriginal,
      attachments: body.attachments,
    });
    return { ok: true, ...result };
  }

  private parseFolder(folder?: string): InboxFolder {
    if (
      folder === "spam" ||
      folder === "all" ||
      folder === "archive" ||
      folder === "trash" ||
      folder === "starred"
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
