import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export type MessagingOperationStampType =
  | "approved"
  | "rejected"
  | "acknowledged";

@Entity({ name: "message_operation_stamps" })
@Index(["messageId", "stampedByCompanyId"], { unique: true })
export class MessageOperationStampEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "message_id", type: "uuid" })
  public messageId!: string;

  @Column({ name: "thread_id", type: "uuid" })
  public threadId!: string;

  @Column({ name: "stamp_type", type: "varchar", length: 16 })
  public stampType!: MessagingOperationStampType;

  @Column({ name: "stamped_by_user_id", type: "uuid" })
  public stampedByUserId!: string;

  @Column({ name: "stamped_by_company_id", type: "uuid" })
  public stampedByCompanyId!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;
}
