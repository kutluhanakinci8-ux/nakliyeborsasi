export class MessagingThreadMessageView {
  public readonly id: string;

  public readonly senderCompanyId: string;

  public readonly bodyText: string;

  public readonly createdAt: string;

  /** Karşı taraf bu mesajı gördü mü (sadece sizin gönderdiğiniz mesajlar için). */
  public readonly readByRecipient: boolean;

  public constructor(params: {
    id: string;
    senderCompanyId: string;
    bodyText: string;
    createdAt: string;
    readByRecipient: boolean;
  }) {
    this.id = params.id;
    this.senderCompanyId = params.senderCompanyId;
    this.bodyText = params.bodyText;
    this.createdAt = params.createdAt;
    this.readByRecipient = params.readByRecipient;
  }
}
