import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { MailOrganizationSupportTicketEntity } from "./MailOrganizationSupportTicketEntity";

export type MailSupportTicketMessageAuthor = "customer" | "staff";

@Entity({ name: "mail_organization_support_ticket_message" })
export class MailOrganizationSupportTicketMessageEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "ticket_id", type: "uuid" })
  public ticketId!: string;

  @Column({ name: "author_user_id", type: "uuid", nullable: true })
  public authorUserId!: string | null;

  @Column({ type: "varchar", length: 16 })
  public authorKind!: MailSupportTicketMessageAuthor;

  @Column({ type: "text" })
  public body!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;

  @ManyToOne(() => MailOrganizationSupportTicketEntity, (ticket) => ticket.messages, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "ticket_id" })
  public ticket!: MailOrganizationSupportTicketEntity;
}
