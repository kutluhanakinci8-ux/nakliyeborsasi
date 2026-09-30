export class MessagingThreadReference {
  public readonly threadId: string;

  public readonly counterpartyCompanyId: string;

  public readonly counterpartyLegalName: string | null;

  public readonly lastMessagePreview: string | null;

  public readonly lastMessageAt: string | null;

  public readonly freightListingId: string | null;

  public readonly unreadCount: number;

  public readonly threadKind: "pair" | "group" | "external_social";

  public readonly title: string | null;

  public readonly participantCompanyIds: string[] | null;

  public readonly externalChannelCode: string | null;

  public readonly externalChannelLabel: string | null;

  public readonly externalOutboundStatus: "ok" | "failed" | null;

  public readonly externalOutboundError: string | null;

  public readonly externalOutboundAt: string | null;

  public constructor(params: {
    threadId: string;
    counterpartyCompanyId: string;
    counterpartyLegalName?: string | null;
    lastMessagePreview?: string | null;
    lastMessageAt?: string | null;
    freightListingId?: string | null;
    unreadCount?: number;
    threadKind?: "pair" | "group" | "external_social";
    title?: string | null;
    participantCompanyIds?: string[] | null;
    externalChannelCode?: string | null;
    externalChannelLabel?: string | null;
    externalOutboundStatus?: "ok" | "failed" | null;
    externalOutboundError?: string | null;
    externalOutboundAt?: string | null;
  }) {
    this.threadId = params.threadId;
    this.counterpartyCompanyId = params.counterpartyCompanyId;
    this.counterpartyLegalName = params.counterpartyLegalName ?? null;
    this.lastMessagePreview = params.lastMessagePreview ?? null;
    this.lastMessageAt = params.lastMessageAt ?? null;
    this.freightListingId = params.freightListingId ?? null;
    this.unreadCount = params.unreadCount ?? 0;
    this.threadKind = params.threadKind ?? "pair";
    this.title = params.title ?? null;
    this.participantCompanyIds = params.participantCompanyIds ?? null;
    this.externalChannelCode = params.externalChannelCode ?? null;
    this.externalChannelLabel = params.externalChannelLabel ?? null;
    this.externalOutboundStatus = params.externalOutboundStatus ?? null;
    this.externalOutboundError = params.externalOutboundError ?? null;
    this.externalOutboundAt = params.externalOutboundAt ?? null;
  }
}
