import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "company_social_outbound_deliveries" })
@Index("idx_social_outbound_deliveries_company_created", [
  "companyId",
  "createdAt",
])
@Index("idx_social_outbound_deliveries_thread", [
  "messageThreadId",
  "createdAt",
])
export class CompanySocialOutboundDeliveryEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "uuid" })
  public messageThreadId!: string;

  @Column({ type: "uuid", nullable: true })
  public messageId!: string | null;

  @Column({ type: "varchar", length: 48 })
  public platformCode!: string;

  @Column({ type: "varchar", length: 16 })
  public status!: "ok" | "failed";

  @Column({ type: "varchar", length: 512, nullable: true })
  public errorMessage!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  public externalMessageId!: string | null;

  @Column({ type: "varchar", length: 280, nullable: true })
  public bodyTextPreview!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
