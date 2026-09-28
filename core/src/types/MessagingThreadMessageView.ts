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

  public readonly attachments: MessagingMessageAttachmentView[];

  public readonly senderKind: "user" | "bot";

  public readonly senderLabel: string | null;

  public constructor(params: {
    id: string;
    senderCompanyId: string;
    bodyText: string;
    createdAt: string;
    readByRecipient: boolean;
    attachments?: MessagingMessageAttachmentView[];
    senderKind?: "user" | "bot";
    senderLabel?: string | null;
  }) {
    this.id = params.id;
    this.senderCompanyId = params.senderCompanyId;
    this.bodyText = params.bodyText;
    this.createdAt = params.createdAt;
    this.readByRecipient = params.readByRecipient;
    this.attachments = params.attachments ?? [];
    this.senderKind = params.senderKind ?? "user";
    this.senderLabel = params.senderLabel ?? null;
  }
}
