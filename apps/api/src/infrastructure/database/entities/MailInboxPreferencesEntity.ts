import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_inbox_preferences" })
export class MailInboxPreferencesEntity {
  @PrimaryColumn({ type: "uuid" })
  public organizationId!: string;

  @Column({ type: "boolean", default: true })
  public dailyDigestEnabled!: boolean;

  @Column({ type: "boolean", default: false })
  public autoReplyEnabled!: boolean;

  @Column({ type: "text", nullable: true })
  public autoReplyBodyText!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  public autoReplyActiveFrom!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  public autoReplyActiveUntil!: Date | null;

  /** comfortable | compact */
  @Column({ type: "varchar", length: 16, default: "comfortable" })
  public inboxListDensity!: string;

  /** Europe/Istanbul takvim günü (YYYY-MM-DD) */
  @Column({ type: "varchar", length: 10, nullable: true })
  public lastDigestSentOn!: string | null;

  /** 0 = anında gönder (geri al kapalı), 5–30 = gecikmeli gönder */
  @Column({ type: "int", default: 5 })
  public undoSendSeconds!: number;

  /** reply | reply_all */
  @Column({ type: "varchar", length: 16, default: "reply" })
  public defaultReplyMode!: string;

  /** show | ask | hide */
  @Column({ type: "varchar", length: 16, default: "show" })
  public remoteImagesPolicy!: string;

  /** list | next | previous */
  @Column({ type: "varchar", length: 16, default: "list" })
  public afterMessageAction!: string;

  @Column({ type: "boolean", default: true })
  public confirmPermanentDelete!: boolean;

  @Column({ type: "boolean", default: true })
  public confirmBulkDelete!: boolean;

  @Column({ type: "boolean", default: false })
  public threadViewEnabled!: boolean;

  /** archive | delete | read */
  @Column({ type: "varchar", length: 16, default: "archive" })
  public swipePrimaryAction!: string;

  @Column({ type: "boolean", default: false })
  public focusedInboxEnabled!: boolean;

  /** Gmail tarzı önem sıralaması (yıldız, okunmamış, kişisel öncelik) */
  @Column({ type: "boolean", default: true })
  public inboxSmartSortEnabled!: boolean;

  /** WebAuthn passkey ile posta kilidi (Outlook mobil biyometri benzeri) */
  @Column({ type: "boolean", default: false })
  public mailAppLockEnabled!: boolean;

  /** full | trimmed | none — yanıt alıntısı (P2) */
  @Column({ type: "varchar", length: 16, default: "full" })
  public replyQuoteMode!: string;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
