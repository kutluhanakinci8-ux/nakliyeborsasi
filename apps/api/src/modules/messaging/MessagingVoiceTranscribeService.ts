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
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { MessageEntity } from "../../infrastructure/database/entities/MessageEntity";
import { MessageVoiceTranscriptEntity } from "../../infrastructure/database/entities/MessageVoiceTranscriptEntity";
import { MailAiComposeService } from "../notification/MailAiComposeService";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";
import {
  messagingVoiceSttConfigured,
  messagingVoiceSttModel,
  messagingVoiceTranscribeFaz1Enabled,
  resolveMessagingVoiceSttApiUrl,
} from "./messagingVoiceTranscribeConfig";

export type VoiceTranscriptView = {
  status: "pending" | "ready" | "failed";
  text: string | null;
  provider: string | null;
};

@Injectable()
export class MessagingVoiceTranscribeService {
  private readonly logger = new Logger(MessagingVoiceTranscribeService.name);

  public constructor(
    @InjectRepository(MessageVoiceTranscriptEntity)
    private readonly transcriptRepository: Repository<MessageVoiceTranscriptEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @Inject(forwardRef(() => MessagingThreadApplicationService))
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
    private readonly mailAiComposeService: MailAiComposeService,
    private readonly configService: ConfigService,
  ) {}

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
      map.set(`${row.messageId}:${row.attachmentIndex}`, {
        status: row.status,
        text: row.textBody,
        provider: row.provider,
      });
    }
    return map;
  }

  public async transcribeVoiceAttachment(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    messageId: string,
    attachmentIndex: number,
    locale: string,
    kvkkConsentAcknowledged: boolean,
  ): Promise<VoiceTranscriptView> {
    if (!messagingVoiceTranscribeFaz1Enabled()) {
      throw new ForbiddenException("Ses transkripsiyonu bu ortamda kapalı.");
    }
    if (!kvkkConsentAcknowledged) {
      throw new BadRequestException("KVKK onayı gerekli.");
    }
    const llmConsent = await this.mailAiComposeService.hasMessagingAiConsent(
      authenticatedUser.userId,
    );
    if (!llmConsent) {
      throw new ForbiddenException(
        "AI / ses işleme rızası gerekli (profil bildirim tercihleri).",
      );
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
    await this.messagingThreadApplicationService.getMessageAttachment(
      authenticatedUser,
      threadId,
      messageId,
      attachmentIndex,
      locale,
    );

    let row = await this.transcriptRepository.findOne({
      where: { messageId, attachmentIndex },
    });
    if (row?.status === "ready" && row.textBody) {
      return {
        status: row.status,
        text: row.textBody,
        provider: row.provider,
      };
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
        kvkkConsentAt: consentAt,
      });
      await this.transcriptRepository.save(row);
    } else {
      row.status = "pending";
      row.requestedByUserId = authenticatedUser.userId;
      row.requestedByCompanyId = authenticatedUser.companyId;
      row.kvkkConsentAt = consentAt;
      await this.transcriptRepository.save(row);
    }

    const file = await this.messagingThreadApplicationService.getMessageAttachment(
      authenticatedUser,
      threadId,
      messageId,
      attachmentIndex,
      locale,
    );
    const result = await this.runSpeechToText(
      file.buffer,
      file.contentType,
      file.filename,
      locale,
    );
    row.status = result.text ? "ready" : "failed";
    row.textBody = result.text;
    row.provider = result.provider;
    await this.transcriptRepository.save(row);

    return {
      status: row.status,
      text: row.textBody,
      provider: row.provider,
    };
  }

  private async runSpeechToText(
    buffer: Buffer,
    contentType: string,
    filename: string,
    locale: string,
  ): Promise<{ text: string | null; provider: string }> {
    if (!messagingVoiceSttConfigured()) {
      return {
        text: null,
        provider: "unconfigured",
      };
    }
    const apiUrl = resolveMessagingVoiceSttApiUrl();
    const apiKey = this.configService
      .get<string>("LERTA_MAIL_AI_COMPOSE_API_KEY")
      ?.trim();
    if (!apiUrl || !apiKey) {
      return { text: null, provider: "unconfigured" };
    }
    const model = messagingVoiceSttModel();
    const language = locale.toLowerCase().startsWith("tr") ? "tr" : undefined;
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
    form.append("response_format", "json");
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
      });
      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(
          `Voice STT failed status=${response.status} body=${body.slice(0, 200)}`,
        );
        return { text: null, provider: "stt-error" };
      }
      const payload = (await response.json()) as { text?: string };
      const text = payload.text?.trim() ?? null;
      return { text, provider: "whisper" };
    } catch (error) {
      this.logger.warn(
        `Voice STT exception: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { text: null, provider: "stt-error" };
    }
  }
}
