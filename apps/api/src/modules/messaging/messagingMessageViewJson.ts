import { MessagingThreadMessageView } from "@nakliyeborsasi/core";
import type { VoiceTranscriptView } from "./MessagingVoiceTranscribeService";

export function messagingMessageViewsToJson(
  messages: MessagingThreadMessageView[],
  transcriptsByMessageAndIndex: Map<string, VoiceTranscriptView>,
): Record<string, unknown>[] {
  return messages.map((message) => ({
    id: message.id,
    senderCompanyId: message.senderCompanyId,
    bodyText: message.bodyText,
    createdAt: message.createdAt,
    readByRecipient: message.readByRecipient,
    readByCounterpartyUserIds: message.readByCounterpartyUserIds,
    readByCounterpartyReaders: message.readByCounterpartyReaders,
    messageKind: message.messageKind,
    editedAt: message.editedAt,
    deleted: message.deleted,
    mentionUserIds: message.mentionUserIds,
    attachments: message.attachments.map((attachment) => ({
      ...attachment,
      transcript:
        transcriptsByMessageAndIndex.get(
          `${message.id}:${attachment.index}`,
        ) ?? undefined,
    })),
    operationStamps: message.operationStamps,
  }));
}
