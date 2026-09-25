import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_dmarc_aggregate" })
export class MailDmarcAggregateReportEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "organization_id", type: "uuid", nullable: true })
  public organizationId!: string | null;

  @Column({ type: "varchar", length: 255 })
  public domain!: string;

  @Column({ name: "period_start", type: "timestamptz" })
  public periodStart!: Date;

  @Column({ name: "period_end", type: "timestamptz" })
  public periodEnd!: Date;

  @Column({ name: "message_count", type: "int", default: 0 })
  public messageCount!: number;

  @Column({ name: "disposition_none", type: "int", default: 0 })
  public dispositionNone!: number;

  @Column({ name: "disposition_quarantine", type: "int", default: 0 })
  public dispositionQuarantine!: number;

  @Column({ name: "disposition_reject", type: "int", default: 0 })
  public dispositionReject!: number;

  @Column({ name: "dkim_pass", type: "int", default: 0 })
  public dkimPass!: number;

  @Column({ name: "dkim_fail", type: "int", default: 0 })
  public dkimFail!: number;

  @Column({ name: "spf_pass", type: "int", default: 0 })
  public spfPass!: number;

  @Column({ name: "spf_fail", type: "int", default: 0 })
  public spfFail!: number;

  @Column({ name: "reporter_org", type: "varchar", length: 255, nullable: true })
  public reporterOrgName!: string | null;

  @CreateDateColumn({ name: "ingested_at", type: "timestamptz" })
  public ingestedAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
