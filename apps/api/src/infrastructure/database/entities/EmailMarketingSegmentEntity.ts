import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type EmailMarketingSegmentDefinition =
  | { type: "manual"; emails: string[] }
  | { type: "subscription_plan"; planCodes: string[] }
  | { type: "participant_type"; participantTypeCodes: string[] };

@Entity({ name: "email_marketing_segments" })
export class EmailMarketingSegmentEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "varchar", length: 128 })
  public name!: string;

  @Column({ type: "jsonb" })
  public definition!: EmailMarketingSegmentDefinition;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
