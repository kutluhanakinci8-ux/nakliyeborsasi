export class MessagingThreadReference {
  public readonly threadId: string;

  public readonly counterpartyCompanyId: string;

  public constructor(params: {
    threadId: string;
    counterpartyCompanyId: string;
  }) {
    this.threadId = params.threadId;
    this.counterpartyCompanyId = params.counterpartyCompanyId;
  }
}
