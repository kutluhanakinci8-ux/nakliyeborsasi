import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "messaging_company_bot" })
export class MessagingCompanyBotEntity {
  @PrimaryColumn({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "varchar", length: 128 })
  public webhookToken!: string;

  @Column({ type: "varchar", length: 128, default: "Lerta Bot" })
  public botDisplayName!: string;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
