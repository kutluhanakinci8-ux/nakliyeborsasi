import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "company_social_slack_notify_dedup" })
export class CompanySocialSlackNotifyDedupEntity {
  @PrimaryColumn({ type: "uuid" })
  public companyId!: string;

  @PrimaryColumn({ type: "varchar", length: 128 })
  public dedupKey!: string;

  @Column({ type: "timestamptz" })
  public lastSentAt!: Date;
}
