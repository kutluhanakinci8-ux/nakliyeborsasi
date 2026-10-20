import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { MailDelayedComposeAttachment } from "./MailDelayedComposeEntity";

export type MailMarketingCampaignRecipient = {
  email: string;
  musteriAdi?: string;
  referans?: string;
};

export type MailMarketingCampaignSegment = {
  referansPrefix?: string;
  referansEquals?: string;
  requireMusteriAdi?: boolean;
  /** CSV / liste ile gelen referans kodları — yalnızca listede olanlar. */
  referansAllowlist?: string[];
};

export type MailMarketingCampaignPayload = {
  text: string;
  html?: string;
  recipients: MailMarketingCampaignRecipient[];
  attachments?: MailDelayedComposeAttachment[];
  merge?: { referans?: string; musteriAdi?: string };
  delayMsBetweenRecipients?: number;
  /** A/B test: çift sıradaki alıcılar (1,3,5…) bu konuyu alır. */
  subjectB?: string;
  /** Örn. ["firma.com", "musteri.com.tr"] — boşsa filtre yok. */
  recipientDomainAllowlist?: string[];
  /** Zamanlanmış kampanyada oluşturucuya bilgi e-postası. */
  notifyCreator?: boolean;
  /** Merge/referans alanlarına göre alıcı filtresi. */
  segment?: MailMarketingCampaignSegment;
  /** Gönderimden önce hatırlatma (dakika); yalnızca zamanlanmış kampanya. */
  reminderMinutesBefore?: number;
  reminderDispatchedAt?: string | null;
  /** Raporlama etiketleri (ör. fuar-2026). */
  tags?: string[];
  /** Entegrasyon idempotency anahtarı (7 gün içinde tekrar create aynı kampanyayı döner). */
  clientReference?: string;
};

export type MailMarketingCampaignResult = {
  attempted: number;
  sent: number;
  skippedSuppressed: number;
  failed: Array<{ email: string; error: string }>;
};

export type MailMarketingCampaignStatus =
  | "scheduled"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

@Entity({ name: "mail_marketing_campaign" })
@Index(["organizationId", "createdAt"])
@Index(["status", "scheduleAt"])
export class MailMarketingCampaignEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid", name: "organization_id" })
  public organizationId!: string;

  @Column({ type: "uuid", name: "created_by_user_id", nullable: true })
  public createdByUserId!: string | null;

  @Column({ type: "varchar", length: 500 })
  public subject!: string;

  @Column({ type: "varchar", length: 16, default: "scheduled" })
  public status!: MailMarketingCampaignStatus;

  @Column({ type: "timestamptz", name: "schedule_at", nullable: true })
  public scheduleAt!: Date | null;

  @Column({ type: "timestamptz", name: "started_at", nullable: true })
  public startedAt!: Date | null;

  @Column({ type: "timestamptz", name: "completed_at", nullable: true })
  public completedAt!: Date | null;

  @Column({ type: "jsonb" })
  public payload!: MailMarketingCampaignPayload;

  @Column({ type: "jsonb", nullable: true })
  public result!: MailMarketingCampaignResult | null;

  @Column({ type: "varchar", length: 500, name: "error_message", nullable: true })
  public errorMessage!: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  public updatedAt!: Date;
}
