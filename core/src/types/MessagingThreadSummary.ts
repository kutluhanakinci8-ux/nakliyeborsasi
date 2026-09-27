export class MessagingThreadSummary {
  public readonly headline: string;

  public readonly bullets: string[];

  public readonly messageCount: number;

  public readonly generatedAt: string;

  /** `structured` = kural tabanlı özet; harici LLM kullanılmaz. */
  public readonly source: "structured";

  public constructor(params: {
    headline: string;
    bullets: string[];
    messageCount: number;
    generatedAt: string;
  }) {
    this.headline = params.headline;
    this.bullets = params.bullets;
    this.messageCount = params.messageCount;
    this.generatedAt = params.generatedAt;
    this.source = "structured";
  }
}
