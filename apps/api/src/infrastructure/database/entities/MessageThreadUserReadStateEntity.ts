import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "message_thread_user_read_states" })
@Index(["threadId", "userId"], { unique: true })
export class MessageThreadUserReadStateEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid", name: "thread_id" })
  public threadId!: string;

  @Column({ type: "uuid", name: "user_id" })
  public userId!: string;

  @Column({ type: "uuid", name: "company_id" })
  public companyId!: string;

  @Column({ type: "timestamptz", nullable: true, name: "last_read_at" })
  public lastReadAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  public updatedAt!: Date;
}
