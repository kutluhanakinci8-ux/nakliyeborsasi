export type MessagingMessageAttachmentView = {
  index: number;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export class MessagingThreadMessageView {
  public readonly id: string;

  public readonly senderCompanyId: string;

  public readonly bodyText: string;

  public readonly createdAt: string;

  /** Karşı taraf bu mesajı gördü mü (sadece sizin gönderdiğiniz mesajlar için). */
  public readonly readByRecipient: boolean;

  /** Karşı şirkette okuyan kullanıcı kimlikleri (iş hesabı). */
  public readonly readByCounterpartyUserIds: string[];

  /** Okuyan karşı taraf kullanıcıları (görünen ad). */
  public readonly readByCounterpartyReaders: {
    userId: string;
    displayName: string;
  }[];

  public readonly messageKind: "public" | "internal";

  public readonly editedAt: string | null;

  public readonly deleted: boolean;

  public readonly mentionUserIds: string[];

  public readonly attachments: MessagingMessageAttachmentView[];

  public constructor(params: {
    id: string;
    senderCompanyId: string;
    bodyText: string;
    createdAt: string;
    readByRecipient: boolean;
    readByCounterpartyUserIds?: string[];
    readByCounterpartyReaders?: { userId: string; displayName: string }[];
    messageKind?: "public" | "internal";
    editedAt?: string | null;
    deleted?: boolean;
    mentionUserIds?: string[];
    attachments?: MessagingMessageAttachmentView[];
  }) {
    this.id = params.id;
    this.senderCompanyId = params.senderCompanyId;
    this.bodyText = params.bodyText;
    this.createdAt = params.createdAt;
    this.readByRecipient = params.readByRecipient;
    this.readByCounterpartyUserIds = params.readByCounterpartyUserIds ?? [];
    this.readByCounterpartyReaders =
      params.readByCounterpartyReaders ??
      (params.readByCounterpartyUserIds ?? []).map((userId) => ({
        userId,
        displayName: userId.slice(0, 8),
      }));
    this.messageKind = params.messageKind ?? "public";
    this.editedAt = params.editedAt ?? null;
    this.deleted = params.deleted ?? false;
    this.mentionUserIds = params.mentionUserIds ?? [];
    this.attachments = params.attachments ?? [];
  }
}
