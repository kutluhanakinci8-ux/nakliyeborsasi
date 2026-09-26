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
  BulkMailInboxSnoozeDto,
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
import { SendDraftRequestDto } from "./SendDraftRequestDto";
import { SnoozeMailMessageRequestDto } from "./SnoozeMailMessageRequestDto";
import { MailInboxPreferencesService } from "./MailInboxPreferencesService";
import { UpdateMailInboxPreferencesRequestDto } from "./MailInboxPreferencesRequestDto";
import {
  CreateMailInboxRuleRequestDto,
  ReorderMailInboxRulesRequestDto,
  UpdateMailInboxRuleRequestDto,
} from "./MailInboxRuleRequestDto";
import { MailOrganizationCalendarService } from "./MailOrganizationCalendarService";
import { MailOrganizationContactService } from "./MailOrganizationContactService";
import { MailCalendarIcsFeedService } from "./MailCalendarIcsFeedService";
import { MailCalendarCalDavService } from "./MailCalendarCalDavService";
import { MailContactCardDavService } from "./MailContactCardDavService";
import {
  CreateMailCalendarEventRequestDto,
  CreateMailOrgContactRequestDto,
  ImportMailCalendarIcsRequestDto,
  ImportMailContactsVcfRequestDto,
  CreateMailCalendarIcsFeedRequestDto,
  UpdateMailCalendarIcsFeedRequestDto,
  CreateMailCalendarCalDavAccountRequestDto,
  UpdateMailCalendarCalDavAccountRequestDto,
  CreateMailContactCardDavAccountRequestDto,
  UpdateMailContactCardDavAccountRequestDto,
  UpdateMailCalendarEventRequestDto,
  UpdateMailOrgContactRequestDto,
} from "./MailCalendarContactRequestDto";

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
    private readonly mailOrganizationCalendarService: MailOrganizationCalendarService,
    private readonly mailOrganizationContactService: MailOrganizationContactService,
    private readonly mailCalendarIcsFeedService: MailCalendarIcsFeedService,
    private readonly mailCalendarCalDavService: MailCalendarCalDavService,
    private readonly mailContactCardDavService: MailContactCardDavService,
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
      toContains: body.toContains,
      requireAttachment: body.requireAttachment,
      matchAnyCondition: body.matchAnyCondition,
      actionStar: body.actionStar,
      actionCustomFolderId: body.actionCustomFolderId ?? null,
      actionArchive: body.actionArchive,
      actionMarkRead: body.actionMarkRead,
      actionTrash: body.actionTrash,
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
      toContains: body.toContains,
      requireAttachment: body.requireAttachment,
      matchAnyCondition: body.matchAnyCondition,
      actionStar: body.actionStar,
      actionCustomFolderId: body.actionCustomFolderId,
      actionArchive: body.actionArchive,
      actionMarkRead: body.actionMarkRead,
      actionTrash: body.actionTrash,
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

  @Get("rules/:ruleId/preview")
  public async previewInboxRule(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("ruleId") ruleId: string,
  ) {
    const preview = await this.mailInboxRuleService.previewRule(
      user.companyId,
      ruleId,
    );
    return { preview };
  }

  @Post("rules/:ruleId/apply-inbox")
  public async applyInboxRuleToExisting(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("ruleId") ruleId: string,
  ) {
    this.assertMailInboxWriter(user);
    const result = await this.mailInboxRuleService.applyRuleToInbox(
      user.companyId,
      ruleId,
    );
    return { ok: true, ...result };
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
    @Body() body: SendDraftRequestDto,
  ) {
    this.assertMailInboxWriter(user);
    if (body.delaySeconds && body.delaySeconds > 0) {
      await this.mailComposeDraftService.getForSend(
        user.companyId,
        user.userId,
        draftId,
      );
      const pending = await this.mailDelayedComposeService.schedule(
        user.companyId,
        {
          kind: "draft_send",
          userId: user.userId,
          draftId,
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

  @Post("messages/bulk/snooze")
  public async bulkSnoozeMessages(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: BulkMailInboxSnoozeDto,
  ) {
    this.assertMailInboxWriter(user);
    const until = new Date(body.snoozedUntil);
    if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
      throw new BadRequestException("Geçerli gelecek bir tarih gerekli.");
    }
    const result = await this.mailOrganizationInboxService.bulkSnoozeMessages(
      user.companyId,
      body.messageIds,
      until,
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
          cc: body.cc,
          bcc: body.bcc,
          replyAll: body.replyAll,
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
      cc: body.cc,
      bcc: body.bcc,
      replyAll: body.replyAll,
      attachments: body.attachments,
    });
    return { ok: true, ...result };
  }

  @Post("messages/:messageId/snooze")
  public async snoozeMessage(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("messageId") messageId: string,
    @Body() body: SnoozeMailMessageRequestDto,
  ) {
    this.assertMailInboxWriter(user);
    if (!body.snoozedUntil) {
      throw new BadRequestException("snoozedUntil gerekli (ISO tarih).");
    }
    const until = new Date(body.snoozedUntil);
    if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
      throw new BadRequestException("Geçerli gelecek bir tarih gerekli.");
    }
    const result = await this.mailOrganizationInboxService.snoozeMessage(
      user.companyId,
      messageId,
      until,
    );
    return { ok: true, ...result };
  }

  @Post("messages/:messageId/unsnooze")
  public async unsnoozeMessage(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("messageId") messageId: string,
  ) {
    this.assertMailInboxWriter(user);
    await this.mailOrganizationInboxService.clearSnooze(
      user.companyId,
      messageId,
    );
    return { ok: true };
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
      folder === "starred" ||
      folder === "snoozed"
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

  @Get("calendar/feeds")
  public async listCalendarIcsFeeds(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    const feeds = await this.mailCalendarIcsFeedService.list(user.companyId);
    return { feeds };
  }

  @Post("calendar/feeds")
  public async createCalendarIcsFeed(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: CreateMailCalendarIcsFeedRequestDto,
  ) {
    this.assertMailInboxWriter(user);
    const feed = await this.mailCalendarIcsFeedService.create(user.companyId, {
      label: body.label,
      feedUrl: body.feedUrl,
      enabled: body.enabled,
    });
    return { ok: true, feed };
  }

  @Patch("calendar/feeds/:feedId")
  public async updateCalendarIcsFeed(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("feedId") feedId: string,
    @Body() body: UpdateMailCalendarIcsFeedRequestDto,
  ) {
    this.assertMailInboxWriter(user);
    const feed = await this.mailCalendarIcsFeedService.update(
      user.companyId,
      feedId,
      {
        label: body.label,
        feedUrl: body.feedUrl,
        enabled: body.enabled,
      },
    );
    return { ok: true, feed };
  }

  @Delete("calendar/feeds/:feedId")
  public async deleteCalendarIcsFeed(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("feedId") feedId: string,
  ) {
    this.assertMailInboxWriter(user);
    await this.mailCalendarIcsFeedService.delete(user.companyId, feedId);
    return { ok: true };
  }

  @Post("calendar/feeds/:feedId/sync")
  public async syncCalendarIcsFeed(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("feedId") feedId: string,
  ) {
    this.assertMailInboxWriter(user);
    const result = await this.mailCalendarIcsFeedService.sync(
      user.companyId,
      feedId,
      user.userId,
    );
    return { ok: true, ...result };
  }

  @Post("calendar/feeds/sync-all")
  public async syncAllCalendarIcsFeeds(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    this.assertMailInboxWriter(user);
    const result = await this.mailCalendarIcsFeedService.syncAllForOrganization(
      user.companyId,
      user.userId,
    );
    return { ok: true, ...result };
  }

  @Get("calendar/caldav/accounts")
  public async listCalendarCalDavAccounts(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    const accounts = await this.mailCalendarCalDavService.list(user.companyId);
    return { accounts };
  }

  @Post("calendar/caldav/accounts")
  public async createCalendarCalDavAccount(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: CreateMailCalendarCalDavAccountRequestDto,
  ) {
    this.assertMailInboxWriter(user);
    const account = await this.mailCalendarCalDavService.create(
      user.companyId,
      {
        label: body.label,
        calendarUrl: body.calendarUrl,
        username: body.username,
        password: body.password,
        enabled: body.enabled,
        writeEnabled: body.writeEnabled,
      },
    );
    return { ok: true, account };
  }

  @Post("calendar/caldav/accounts/sync-all")
  public async syncAllCalendarCalDavAccounts(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    this.assertMailInboxWriter(user);
    const result =
      await this.mailCalendarCalDavService.syncAllForOrganization(
        user.companyId,
        user.userId,
      );
    return { ok: true, ...result };
  }

  @Patch("calendar/caldav/accounts/:accountId")
  public async updateCalendarCalDavAccount(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("accountId") accountId: string,
    @Body() body: UpdateMailCalendarCalDavAccountRequestDto,
  ) {
    this.assertMailInboxWriter(user);
    const account = await this.mailCalendarCalDavService.update(
      user.companyId,
      accountId,
      {
        label: body.label,
        calendarUrl: body.calendarUrl,
        username: body.username,
        password: body.password,
        enabled: body.enabled,
        writeEnabled: body.writeEnabled,
      },
    );
    return { ok: true, account };
  }

  @Delete("calendar/caldav/accounts/:accountId")
  public async deleteCalendarCalDavAccount(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("accountId") accountId: string,
  ) {
    this.assertMailInboxWriter(user);
    await this.mailCalendarCalDavService.delete(user.companyId, accountId);
    return { ok: true };
  }

  @Post("calendar/caldav/accounts/:accountId/sync")
  public async syncCalendarCalDavAccount(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("accountId") accountId: string,
  ) {
    this.assertMailInboxWriter(user);
    const result = await this.mailCalendarCalDavService.sync(
      user.companyId,
      accountId,
      user.userId,
    );
    return { ok: true, ...result };
  }

  @Post("calendar/caldav/accounts/:accountId/push/:eventId")
  public async pushCalendarEventToCalDav(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("accountId") accountId: string,
    @Param("eventId") eventId: string,
  ) {
    this.assertMailInboxWriter(user);
    const result = await this.mailCalendarCalDavService.pushEventToAccount(
      user.companyId,
      accountId,
      eventId,
    );
    return { ok: true, ...result };
  }

  @Get("calendar/events")
  public async listCalendarEvents(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("from") fromRaw: string,
    @Query("to") toRaw: string,
  ) {
    const from = this.parseIsoDateQuery(fromRaw, "from");
    const to = this.parseIsoDateQuery(toRaw, "to");
    const events = await this.mailOrganizationCalendarService.listInRange(
      user.companyId,
      from,
      to,
    );
    return { events };
  }

  @Post("calendar/events")
  public async createCalendarEvent(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: CreateMailCalendarEventRequestDto,
  ) {
    const event = await this.mailOrganizationCalendarService.create(
      user.companyId,
      user.userId,
      {
        title: body.title,
        description: body.description,
        location: body.location,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        allDay: body.allDay,
        recurrenceFrequency: body.recurrenceFrequency,
        recurrenceUntil: body.recurrenceUntil
          ? new Date(body.recurrenceUntil)
          : null,
      },
    );
    return { ok: true, event };
  }

  @Patch("calendar/events/:eventId")
  public async updateCalendarEvent(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("eventId") eventId: string,
    @Body() body: UpdateMailCalendarEventRequestDto,
  ) {
    const event = await this.mailOrganizationCalendarService.update(
      user.companyId,
      eventId,
      {
        title: body.title,
        description: body.description,
        location: body.location,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        allDay: body.allDay,
        recurrenceFrequency: body.recurrenceFrequency,
        recurrenceUntil:
          body.recurrenceUntil !== undefined
            ? body.recurrenceUntil
              ? new Date(body.recurrenceUntil)
              : null
            : undefined,
      },
    );
    return { ok: true, event };
  }

  @Delete("calendar/events/:eventId")
  public async deleteCalendarEvent(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("eventId") eventId: string,
    @Query("occurrenceStartsAt") occurrenceStartsAtRaw?: string,
  ) {
    const occurrenceStartsAt = occurrenceStartsAtRaw
      ? new Date(occurrenceStartsAtRaw)
      : undefined;
    await this.mailOrganizationCalendarService.delete(
      user.companyId,
      eventId,
      occurrenceStartsAt,
    );
    return { ok: true };
  }

  @Get("calendar/export.ics")
  public async exportCalendarIcs(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("from") fromRaw: string,
    @Query("to") toRaw: string,
    @Res() res: Response,
  ) {
    const from = this.parseIsoDateQuery(fromRaw, "from");
    const to = this.parseIsoDateQuery(toRaw, "to");
    const ics = await this.mailOrganizationCalendarService.exportIcs(
      user.companyId,
      from,
      to,
    );
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="lerta-takvim.ics"',
    );
    res.send(ics);
  }

  @Post("calendar/import")
  public async importCalendarIcs(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: ImportMailCalendarIcsRequestDto,
  ) {
    const result = await this.mailOrganizationCalendarService.importIcs(
      user.companyId,
      user.userId,
      body.ics,
    );
    return { ok: true, ...result };
  }

  @Get("contacts/carddav/accounts")
  public async listContactCardDavAccounts(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    const accounts = await this.mailContactCardDavService.list(user.companyId);
    return { accounts };
  }

  @Post("contacts/carddav/accounts")
  public async createContactCardDavAccount(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: CreateMailContactCardDavAccountRequestDto,
  ) {
    this.assertMailInboxWriter(user);
    const account = await this.mailContactCardDavService.create(
      user.companyId,
      {
        label: body.label,
        addressbookUrl: body.addressbookUrl,
        username: body.username,
        password: body.password,
        enabled: body.enabled,
        writeEnabled: body.writeEnabled,
      },
    );
    return { ok: true, account };
  }

  @Post("contacts/carddav/accounts/sync-all")
  public async syncAllContactCardDavAccounts(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    this.assertMailInboxWriter(user);
    const result = await this.mailContactCardDavService.syncAllForOrganization(
      user.companyId,
    );
    return { ok: true, ...result };
  }

  @Patch("contacts/carddav/accounts/:accountId")
  public async updateContactCardDavAccount(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("accountId") accountId: string,
    @Body() body: UpdateMailContactCardDavAccountRequestDto,
  ) {
    this.assertMailInboxWriter(user);
    const account = await this.mailContactCardDavService.update(
      user.companyId,
      accountId,
      {
        label: body.label,
        addressbookUrl: body.addressbookUrl,
        username: body.username,
        password: body.password,
        enabled: body.enabled,
        writeEnabled: body.writeEnabled,
      },
    );
    return { ok: true, account };
  }

  @Delete("contacts/carddav/accounts/:accountId")
  public async deleteContactCardDavAccount(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("accountId") accountId: string,
  ) {
    this.assertMailInboxWriter(user);
    await this.mailContactCardDavService.delete(user.companyId, accountId);
    return { ok: true };
  }

  @Post("contacts/carddav/accounts/:accountId/sync")
  public async syncContactCardDavAccount(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("accountId") accountId: string,
  ) {
    this.assertMailInboxWriter(user);
    const result = await this.mailContactCardDavService.sync(
      user.companyId,
      accountId,
    );
    return { ok: true, ...result };
  }

  @Post("contacts/carddav/accounts/:accountId/push/:contactId")
  public async pushContactToCardDav(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("accountId") accountId: string,
    @Param("contactId") contactId: string,
  ) {
    this.assertMailInboxWriter(user);
    const result = await this.mailContactCardDavService.pushContactToAccount(
      user.companyId,
      accountId,
      contactId,
    );
    return { ok: true, ...result };
  }

  @Get("contacts")
  public async listOrgContacts(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    const contacts = await this.mailOrganizationContactService.list(
      user.companyId,
    );
    return { contacts };
  }

  @Post("contacts")
  public async createOrgContact(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: CreateMailOrgContactRequestDto,
  ) {
    const contact = await this.mailOrganizationContactService.create(
      user.companyId,
      {
        displayName: body.displayName,
        email: body.email,
        phone: body.phone,
        notes: body.notes,
      },
    );
    return { ok: true, contact };
  }

  @Patch("contacts/:contactId")
  public async updateOrgContact(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("contactId") contactId: string,
    @Body() body: UpdateMailOrgContactRequestDto,
  ) {
    const contact = await this.mailOrganizationContactService.update(
      user.companyId,
      contactId,
      {
        displayName: body.displayName,
        email: body.email,
        phone: body.phone,
        notes: body.notes,
      },
    );
    return { ok: true, contact };
  }

  @Delete("contacts/:contactId")
  public async deleteOrgContact(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("contactId") contactId: string,
  ) {
    await this.mailOrganizationContactService.delete(
      user.companyId,
      contactId,
    );
    return { ok: true };
  }

  @Post("contacts/import")
  public async importContactsVcf(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: ImportMailContactsVcfRequestDto,
  ) {
    const result = await this.mailOrganizationContactService.importVcf(
      user.companyId,
      body.vcf,
    );
    return { ok: true, ...result };
  }

  @Get("contacts/export.vcf")
  public async exportContactsVcf(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Res() res: Response,
  ) {
    const vcf = await this.mailOrganizationContactService.exportVcf(
      user.companyId,
    );
    res.setHeader("Content-Type", "text/vcard; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="lerta-kisiler.vcf"',
    );
    res.send(vcf);
  }

  private parseIsoDateQuery(value: string, label: string): Date {
    const raw = value?.trim();
    if (!raw) {
      throw new BadRequestException(`${label} gerekli (ISO tarih).`);
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} geçersiz.`);
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
