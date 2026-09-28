export class MessagingThreadReference {
  public readonly threadId: string;

  public readonly counterpartyCompanyId: string;

  public readonly counterpartyLegalName: string | null;

  public readonly lastMessagePreview: string | null;

  public readonly lastMessageAt: string | null;

  public readonly freightListingId: string | null;

  public readonly unreadCount: number;

  public readonly threadKind: "b2b" | "org_channel";

  public readonly channelSlug: string | null;

  public readonly channelName: string | null;

  public constructor(params: {
    threadId: string;
    counterpartyCompanyId: string;
    counterpartyLegalName?: string | null;
    lastMessagePreview?: string | null;
    lastMessageAt?: string | null;
    freightListingId?: string | null;
    unreadCount?: number;
    threadKind?: "b2b" | "org_channel";
    channelSlug?: string | null;
    channelName?: string | null;
  }) {
    this.threadId = params.threadId;
    this.counterpartyCompanyId = params.counterpartyCompanyId;
    this.counterpartyLegalName = params.counterpartyLegalName ?? null;
    this.lastMessagePreview = params.lastMessagePreview ?? null;
    this.lastMessageAt = params.lastMessageAt ?? null;
    this.freightListingId = params.freightListingId ?? null;
    this.unreadCount = params.unreadCount ?? 0;
    this.threadKind = params.threadKind ?? "b2b";
    this.channelSlug = params.channelSlug ?? null;
    this.channelName = params.channelName ?? null;
  }
}
