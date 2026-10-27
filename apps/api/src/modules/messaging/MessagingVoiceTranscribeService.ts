import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  AuthenticatedUserContext,
  DEFAULT_LOCALE,
} from "@nakliyeborsasi/core";
import { MESSAGING_EXTERNAL_INBOUND_SENDER_USER_ID } from "./MessagingThreadApplicationService";
import { messagingVoiceBridgeSttFaz1Enabled } from "./messagingVoiceBridgeSttConfig";
import { MessageEntity } from "../../infrastructure/database/entities/MessageEntity";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { MessageVoiceTranscriptEntity } from "../../infrastructure/database/entities/MessageVoiceTranscriptEntity";
import { CompanyMessagingSettingsEntity } from "../../infrastructure/database/entities/CompanyMessagingSettingsEntity";
import { MailAiComposeService } from "../notification/MailAiComposeService";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";
import {
  applyMessagingVoiceSttGlossary,
  resolveMessagingVoiceSttLanguage,
} from "./messagingVoiceSttGlossary";
import { withMessagingVoiceSttSlot } from "./messagingVoiceSttConcurrency";
import {
  messagingVoiceSttAuthOptional,
  messagingVoiceSttConfigured,
  messagingVoiceSttMaxConcurrent,
  resolveMessagingVoiceSttApiKey,
  resolveMessagingVoiceSttProvider,
  messagingVoiceSttModel,
  messagingVoiceSttMonthlyQuotaPerCompany,
  messagingVoiceSttTrQualityFaz1Enabled,
  messagingVoiceTranscribeAdvancedFaz2Enabled,
  messagingVoiceTranscribeAutoFaz3Enabled,
  messagingVoiceTranscribeFaz1Enabled,
  resolveMessagingVoiceSttApiUrl,
} from "./messagingVoiceTranscribeConfig";

export type VoiceTranscriptView = {
  status: "pending" | "ready" | "failed";
  text: string | null;
  provider: string | null;
  languageCode?: string | null;
  confidenceScore?: number | null;
  editedText?: string | null;
  displayText?: string | null;
};

@Injectable()
export class MessagingVoiceTranscribeService {
  private readonly logger = new Logger(MessagingVoiceTranscribeService.name);

  public constructor(
    @InjectRepository(MessageVoiceTranscriptEntity)
    private readonly transcriptRepository: Repository<MessageVoiceTranscriptEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageThreadEntity)
    private readonly threadRepository: Repository<MessageThreadEntity>,
    @InjectRepository(CompanyMessagingSettingsEntity)
    private readonly companyMessagingSettingsRepository: Repository<CompanyMessagingSettingsEntity>,
    @Inject(forwardRef(() => MessagingThreadApplicationService))
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
    private readonly mailAiComposeService: MailAiComposeService,
    private readonly configService: ConfigService,
  ) {}

  private rowToView(row: MessageVoiceTranscriptEntity): VoiceTranscriptView {
    const display =
      row.editedTextBody?.trim() || row.textBody?.trim() || null;
    return {
      status: row.status,
      text: row.textBody,
      provider: row.provider,
      languageCode: row.languageCode,
      confidenceScore: row.confidenceScore,
      editedText: row.editedTextBody,
      displayText: display,
    };
  }

  private syncSearchText(row: MessageVoiceTranscriptEntity): void {
    const display =
      row.editedTextBody?.trim() || row.textBody?.trim() || "";
    row.searchText = display ? display.slice(0, 8000) : null;
  }

  public async countSttUsageThisMonth(companyId: string): Promise<number> {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    return this.transcriptRepository
      .createQueryBuilder("t")
      .where("t.requestedByCompanyId = :companyId", { companyId })
      .andWhere("t.createdAt >= :start", { start })
      .andWhere("t.status IN (:...statuses)", {
        statuses: ["ready", "pending"],
      })
      .getCount();
  }

  public async maybeAutoTranscribeBridgeInbound(
    companyId: string,
    threadId: string,
    message: MessageEntity,
    bridgePlatform: string,
  ): Promise<void> {
    if (!messagingVoiceBridgeSttFaz1Enabled()) {
      return;
    }
    if (!messagingVoiceTranscribeAutoFaz3Enabled()) {
      return;
    }
    if (!messagingVoiceTranscribeFaz1Enabled() || !messagingVoiceSttConfigured()) {
      return;
    }
    const settings = await this.companyMessagingSettingsRepository.findOne({
      where: { companyId },
    });
    if (settings?.voiceTranscribeMode !== "auto") {
      return;
    }
    if (!settings.voiceTranscribeAutoKvkkAcceptedAt) {
      return;
    }
    const attachments = message.attachments ?? [];
    const voiceIndexes = attachments
      .filter(
        (row) =>
          row.kind === "voice_note" ||
          row.contentType.toLowerCase().startsWith("audio/"),
      )
      .map((row) => row.index);
    if (voiceIndexes.length === 0) {
      return;
    }
    const actor = new AuthenticatedUserContext({
      userId: MESSAGING_EXTERNAL_INBOUND_SENDER_USER_ID,
      companyId,
      emailAddress: "bridge-inbound@system.local",
      roleCodes: [],
    });
    const quota = messagingVoiceSttMonthlyQuotaPerCompany();
    let used = await this.countSttUsageThisMonth(companyId);
    for (const attachmentIndex of voiceIndexes) {
      if (used >= quota) {
        this.logger.warn(
          `Bridge STT kota doldu (company=${companyId})`,
        );
        return;
      }
      try {
        await this.transcribeVoiceAttachment(
          actor,
          threadId,
          message.id,
          attachmentIndex,
          DEFAULT_LOCALE,
          true,
          {
            skipConsentCheck: true,
            skipParticipantAccessCheck: true,
            transcriptSource: "bridge_inbound",
            bridgePlatform,
          },
        );
        used += 1;
      } catch (error) {
        this.logger.warn(
          `Bridge inbound STT failed message=${message.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  public async exportCompanyTranscriptsCsv(
    companyId: string,
    limit = 500,
  ): Promise<{ csv: string; rowCount: number }> {
    const capped = Math.min(Math.max(limit, 1), 2000);
    const rows = await this.transcriptRepository
      .createQueryBuilder("t")
      .where("t.requestedByCompanyId = :companyId", { companyId })
      .orderBy("t.createdAt", "DESC")
      .take(capped)
      .getMany();
    const header =
      "messageId,attachmentIndex,status,transcriptSource,bridgePlatform,languageCode,confidenceScore,createdAt,textPreview";
    const lines = rows.map((row) => {
      const text =
        row.editedTextBody?.trim() || row.textBody?.trim() || "";
      const preview = text.replace(/"/g, '""').slice(0, 500);
      return [
        row.messageId,
        row.attachmentIndex,
        row.status,
        row.transcriptSource ?? "manual",
        row.bridgePlatform ?? "",
        row.languageCode ?? "",
        row.confidenceScore ?? "",
        row.createdAt.toISOString(),
        `"${preview}"`,
      ].join(",");
    });
    return { csv: [header, ...lines].join("\n"), rowCount: rows.length };
  }

  public async maybeAutoTranscribeAfterSend(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    message: MessageEntity,
    locale: string,
  ): Promise<void> {
    if (!messagingVoiceTranscribeAutoFaz3Enabled()) {
      return;
    }
    if (!messagingVoiceTranscribeFaz1Enabled() || !messagingVoiceSttConfigured()) {
      return;
    }
    const settings = await this.companyMessagingSettingsRepository.findOne({
      where: { companyId: authenticatedUser.companyId },
    });
    if (settings?.voiceTranscribeMode !== "auto") {
      return;
    }
    if (!settings.voiceTranscribeAutoKvkkAcceptedAt) {
      return;
    }
    const attachments = message.attachments ?? [];
    const voiceIndexes = attachments
      .filter(
        (row) =>
          row.kind === "voice_note" ||
          row.contentType.toLowerCase().startsWith("audio/"),
      )
      .map((row) => row.index);
    if (voiceIndexes.length === 0) {
      return;
    }
    const quota = messagingVoiceSttMonthlyQuotaPerCompany();
    let used = await this.countSttUsageThisMonth(authenticatedUser.companyId);
    for (const attachmentIndex of voiceIndexes) {
      if (used >= quota) {
        this.logger.warn(
          `STT aylık kota doldu (company=${authenticatedUser.companyId})`,
        );
        return;
      }
      try {
        await this.transcribeVoiceAttachment(
          authenticatedUser,
          threadId,
          message.id,
          attachmentIndex,
          locale,
          true,
          { skipConsentCheck: true, transcriptSource: "outbound_auto" },
        );
        used += 1;
      } catch (error) {
        this.logger.warn(
          `Otomatik STT başarısız message=${message.id} index=${attachmentIndex}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  public async mapTranscriptsByMessageAndIndex(
    messageIds: string[],
  ): Promise<Map<string, VoiceTranscriptView>> {
    if (messageIds.length === 0) {
      return new Map();
    }
    const rows = await this.transcriptRepository.find({
      where: { messageId: In(messageIds) },
    });
    const map = new Map<string, VoiceTranscriptView>();
    for (const row of rows) {
      map.set(`${row.messageId}:${row.attachmentIndex}`, this.rowToView(row));
    }
    return map;
  }

  public async searchTranscriptHits(
    companyId: string,
    term: string,
    limit: number,
  ): Promise<
    Array<{
      threadId: string;
      messageId: string;
      snippet: string;
      createdAt: string;
    }>
  > {
    if (!messagingVoiceTranscribeAdvancedFaz2Enabled()) {
      return [];
    }
    const transcripts = await this.transcriptRepository
      .createQueryBuilder("t")
      .innerJoin(MessageEntity, "message", "message.id = t.messageId")
      .innerJoin(MessageThreadEntity, "thread", "thread.id = message.threadId")
      .where(
        "(thread.companyAId = :companyId OR thread.companyBId = :companyId)",
        { companyId },
      )
      .andWhere("t.status = 'ready'")
      .andWhere("t.search_text ILIKE :q", { q: `%${term}%` })
      .orderBy("t.updatedAt", "DESC")
      .take(limit)
      .getMany();
    if (transcripts.length === 0) {
      return [];
    }
    const messages = await this.messageRepository.find({
      where: { id: In(transcripts.map((row) => row.messageId)) },
    });
    const messageById = new Map(messages.map((row) => [row.id, row]));
    return transcripts
      .map((row) => {
        const message = messageById.get(row.messageId);
        if (!message) {
          return null;
        }
        return {
          threadId: message.threadId,
          messageId: row.messageId,
          snippet: (row.searchText ?? "").slice(0, 240),
          createdAt: message.createdAt.toISOString(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }

  public async editTranscript(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    messageId: string,
    attachmentIndex: number,
    locale: string,
    editedText: string,
    languageCode?: string,
  ): Promise<VoiceTranscriptView> {
    if (!messagingVoiceTranscribeAdvancedFaz2Enabled()) {
      throw new ForbiddenException("Transkript düzenleme bu ortamda kapalı.");
    }
    await this.messagingThreadApplicationService.getMessageAttachment(
      authenticatedUser,
      threadId,
      messageId,
      attachmentIndex,
      locale,
    );
    const row = await this.transcriptRepository.findOne({
      where: { messageId, attachmentIndex },
    });
    if (!row || row.status !== "ready") {
      throw new NotFoundException("Hazır transkript bulunamadı.");
    }
    row.editedTextBody = editedText.trim();
    row.editedByUserId = authenticatedUser.userId;
    row.editedAt = new Date();
    if (languageCode?.trim()) {
      row.languageCode = languageCode.trim().slice(0, 8);
    }
    this.syncSearchText(row);
    await this.transcriptRepository.save(row);
    return this.rowToView(row);
  }

  public async transcribeVoiceAttachment(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    messageId: string,
    attachmentIndex: number,
    locale: string,
    kvkkConsentAcknowledged: boolean,
    options?: {
      languageCode?: string;
      skipConsentCheck?: boolean;
      skipParticipantAccessCheck?: boolean;
      transcriptSource?: "manual" | "outbound_auto" | "bridge_inbound";
      bridgePlatform?: string;
    },
  ): Promise<VoiceTranscriptView> {
    if (!messagingVoiceTranscribeFaz1Enabled()) {
      throw new ForbiddenException("Ses transkripsiyonu bu ortamda kapalı.");
    }
    if (!kvkkConsentAcknowledged && !options?.skipConsentCheck) {
      throw new BadRequestException("KVKK onayı gerekli.");
    }
    if (!options?.skipConsentCheck) {
      const llmConsent = await this.mailAiComposeService.hasMessagingAiConsent(
        authenticatedUser.userId,
      );
      if (!llmConsent) {
        throw new ForbiddenException(
          "AI / ses işleme rızası gerekli (profil bildirim tercihleri).",
        );
      }
    }
    const message = await this.messageRepository.findOne({
      where: { id: messageId, threadId },
    });
    if (!message?.attachments?.length) {
      throw new NotFoundException("Mesaj veya ek bulunamadı.");
    }
    const meta = message.attachments.find((row) => row.index === attachmentIndex);
    if (!meta) {
      throw new NotFoundException("Ek bulunamadı.");
    }
    const isVoice =
      meta.kind === "voice_note" ||
      meta.contentType.toLowerCase().startsWith("audio/");
    if (!isVoice) {
      throw new BadRequestException("Yalnızca sesli mesaj ekleri transkribe edilir.");
    }
    if (!options?.skipParticipantAccessCheck) {
      await this.messagingThreadApplicationService.getMessageAttachment(
        authenticatedUser,
        threadId,
        messageId,
        attachmentIndex,
        locale,
      );
    }

    const transcriptSource = options?.transcriptSource ?? "manual";

    let row = await this.transcriptRepository.findOne({
      where: { messageId, attachmentIndex },
    });
    if (row?.status === "ready" && (row.textBody || row.editedTextBody)) {
      return this.rowToView(row);
    }

    const consentAt = new Date();
    if (!row) {
      row = this.transcriptRepository.create({
        messageId,
        attachmentIndex,
        requestedByUserId: authenticatedUser.userId,
        requestedByCompanyId: authenticatedUser.companyId,
        status: "pending",
        textBody: null,
        provider: null,
        languageCode: null,
        confidenceScore: null,
        editedTextBody: null,
        editedByUserId: null,
        editedAt: null,
        searchText: null,
        kvkkConsentAt: consentAt,
        transcriptSource,
        bridgePlatform: options?.bridgePlatform?.slice(0, 32) ?? null,
      });
      await this.transcriptRepository.save(row);
    } else {
      row.status = "pending";
      row.requestedByUserId = authenticatedUser.userId;
      row.requestedByCompanyId = authenticatedUser.companyId;
      row.kvkkConsentAt = consentAt;
      row.transcriptSource = transcriptSource;
      row.bridgePlatform = options?.bridgePlatform?.slice(0, 32) ?? null;
      await this.transcriptRepository.save(row);
    }

    const file = options?.skipParticipantAccessCheck
      ? await this.messagingThreadApplicationService.readMessageAttachmentFile(
          threadId,
          messageId,
          attachmentIndex,
        )
      : await this.messagingThreadApplicationService.getMessageAttachment(
          authenticatedUser,
          threadId,
          messageId,
          attachmentIndex,
          locale,
        );
    const language = resolveMessagingVoiceSttLanguage(
      locale,
      options?.languageCode,
    );
    const result = await this.runSpeechToText(
      file.buffer,
      file.contentType,
      file.filename,
      language,
    );
    row.status = result.text ? "ready" : "failed";
    row.textBody = result.text;
    row.provider = result.provider;
    row.languageCode = language ?? null;
    row.confidenceScore = result.confidenceScore;
    this.syncSearchText(row);
    await this.transcriptRepository.save(row);

    return this.rowToView(row);
  }

  private async runSpeechToText(
    buffer: Buffer,
    contentType: string,
    filename: string,
    language?: string,
  ): Promise<{
    text: string | null;
    provider: string;
    confidenceScore: number | null;
  }> {
    if (!messagingVoiceSttConfigured()) {
      return {
        text: null,
        provider: "unconfigured",
        confidenceScore: null,
      };
    }
    const apiUrl = resolveMessagingVoiceSttApiUrl();
    const apiKey = resolveMessagingVoiceSttApiKey();
    if (!apiUrl) {
      return { text: null, provider: "unconfigured", confidenceScore: null };
    }
    if (!apiKey && !messagingVoiceSttAuthOptional()) {
      return { text: null, provider: "unconfigured", confidenceScore: null };
    }
    const outcome = await withMessagingVoiceSttSlot(
      messagingVoiceSttMaxConcurrent(),
      async () => {
        const model = messagingVoiceSttModel();
        const advanced = messagingVoiceTranscribeAdvancedFaz2Enabled();
        const applyGlossary =
          advanced || messagingVoiceSttTrQualityFaz1Enabled();
        const providerKind = resolveMessagingVoiceSttProvider();
        const preferVerbose = advanced && providerKind === "openai";
        const form = new FormData();
        const bytes = new Uint8Array(buffer);
        form.append(
          "file",
          new Blob([bytes], { type: contentType }),
          filename || "voice.webm",
        );
        form.append("model", model);
        if (language) {
          form.append("language", language);
        }
        form.append("response_format", preferVerbose ? "verbose_json" : "json");
        try {
          const headers: Record<string, string> = {};
          if (apiKey) {
            headers.Authorization = `Bearer ${apiKey}`;
          }
          let response = await fetch(apiUrl, {
            method: "POST",
            headers,
            body: form,
          });
          if (!response.ok && preferVerbose) {
            const body = await response.text();
            this.logger.warn(
              `Voice STT verbose_json failed status=${response.status} — json retry`,
            );
            const retryForm = new FormData();
            retryForm.append(
              "file",
              new Blob([bytes], { type: contentType }),
              filename || "voice.webm",
            );
            retryForm.append("model", model);
            if (language) {
              retryForm.append("language", language);
            }
            retryForm.append("response_format", "json");
            response = await fetch(apiUrl, {
              method: "POST",
              headers,
              body: retryForm,
            });
            if (!response.ok) {
              this.logger.warn(
                `Voice STT failed status=${response.status} body=${body.slice(0, 200)}`,
              );
              return {
                text: null,
                provider: "stt-error",
                confidenceScore: null,
              };
            }
          } else if (!response.ok) {
            const body = await response.text();
            this.logger.warn(
              `Voice STT failed status=${response.status} body=${body.slice(0, 200)}`,
            );
            return { text: null, provider: "stt-error", confidenceScore: null };
          }
          const payload = (await response.json()) as {
            text?: string;
            segments?: { avg_logprob?: number }[];
          };
          let text = payload.text?.trim() ?? null;
          if (text && applyGlossary) {
            text = applyMessagingVoiceSttGlossary(text);
          }
          let confidenceScore: number | null = null;
          if (advanced && payload.segments?.length) {
            const probs = payload.segments
              .map((segment) => segment.avg_logprob)
              .filter((value): value is number => typeof value === "number");
            if (probs.length > 0) {
              const avg =
                probs.reduce((sum, value) => sum + value, 0) / probs.length;
              confidenceScore = Math.min(1, Math.max(0, Math.exp(avg)));
            }
          }
          return {
            text,
            provider: providerKind === "openai" ? "whisper" : "local-whisper",
            confidenceScore,
          };
        } catch (error) {
          this.logger.warn(
            `Voice STT exception: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          return { text: null, provider: "stt-error", confidenceScore: null };
        }
      },
    );
    if (outcome === "stt-busy") {
      this.logger.warn("Voice STT rejected: max concurrent jobs reached");
      return { text: null, provider: "stt-busy", confidenceScore: null };
    }
    return outcome;
  }
}
