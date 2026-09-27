export class MessagingThreadReference {
  public readonly threadId: string;

  public readonly counterpartyCompanyId: string;

  public readonly counterpartyLegalName: string | null;

  public readonly lastMessagePreview: string | null;

  public readonly lastMessageAt: string | null;

  public readonly freightListingId: string | null;

  public constructor(params: {
    threadId: string;
    counterpartyCompanyId: string;
    counterpartyLegalName?: string | null;
    lastMessagePreview?: string | null;
    lastMessageAt?: string | null;
    freightListingId?: string | null;
  }) {
    this.threadId = params.threadId;
    this.counterpartyCompanyId = params.counterpartyCompanyId;
    this.counterpartyLegalName = params.counterpartyLegalName ?? null;
    this.lastMessagePreview = params.lastMessagePreview ?? null;
    this.lastMessageAt = params.lastMessageAt ?? null;
    this.freightListingId = params.freightListingId ?? null;
  }
}
