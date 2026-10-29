import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { MailOrganizationSupportTicketMessageEntity } from "./MailOrganizationSupportTicketMessageEntity";

export type MailSupportTicketTopic =
  | "technical"
  | "billing"
  | "sales"
  | "general";

export type MailSupportTicketStatus = "open" | "waiting_customer" | "resolved";

@Entity({ name: "mail_organization_support_ticket" })
export class MailOrganizationSupportTicketEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "organization_id", type: "uuid" })
  public organizationId!: string;

  @Column({ name: "created_by_user_id", type: "uuid" })
  public createdByUserId!: string;

  @Column({ type: "varchar", length: 16 })
  public topic!: MailSupportTicketTopic;

  @Column({ type: "varchar", length: 200 })
  public subject!: string;

  @Column({ type: "varchar", length: 16, default: "open" })
  public status!: MailSupportTicketStatus;

  @Column({ name: "domain_name", type: "varchar", length: 253, nullable: true })
  public domainName!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;

  @OneToMany(
    () => MailOrganizationSupportTicketMessageEntity,
    (message) => message.ticket,
  )
  public messages!: MailOrganizationSupportTicketMessageEntity[];
}
