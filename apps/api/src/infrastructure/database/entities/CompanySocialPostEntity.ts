import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "company_social_posts" })
@Index("idx_company_social_posts_company_status", ["companyId", "statusCode"])
export class CompanySocialPostEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  /** Virgülle ayrılmış SocialPlatformCode listesi */
  @Column({ type: "varchar", length: 256 })
  public platformCodes!: string;

  @Column({ type: "varchar", length: 32 })
  public statusCode!: string;

  @Column({ type: "text" })
  public bodyText!: string;

  /** JSON string: string[] medya URL */
  @Column({ type: "text", nullable: true })
  public mediaUrlsJson!: string | null;

  /** JSON: utmSource, utmMedium, utmCampaign, utmContent */
  @Column({ type: "text", nullable: true })
  public utmParamsJson!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  public scheduledAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  public publishedAt!: Date | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  public externalPostId!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  public lastErrorMessage!: string | null;

  @Column({ type: "uuid" })
  public createdByUserId!: string;

  @Column({ type: "timestamptz", nullable: true })
  public approvedAt!: Date | null;

  @Column({ type: "uuid", nullable: true })
  public approvedByUserId!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
