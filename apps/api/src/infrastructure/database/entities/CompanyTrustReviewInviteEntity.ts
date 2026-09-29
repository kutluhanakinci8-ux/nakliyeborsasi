import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "company_trust_review_invites" })
@Index(
  "uq_trust_review_invite_source",
  ["authorCompanyId", "targetCompanyId", "sourceCode", "sourceId"],
  { unique: true },
)
export class CompanyTrustReviewInviteEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  /** Değerlendirme yapacak firma */
  @Column({ type: "uuid" })
  public authorCompanyId!: string;

  /** Puanlanacak partner firma */
  @Column({ type: "uuid" })
  public targetCompanyId!: string;

  @Column({ type: "varchar", length: 32 })
  public sourceCode!: string;

  @Column({ type: "uuid" })
  public sourceId!: string;

  @Column({ type: "varchar", length: 240, nullable: true })
  public contextLabel!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  public fulfilledAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  public dismissedAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  public reminderSentAt!: Date | null;
}
