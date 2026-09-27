import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "message_thread_read_states" })
@Index(["threadId", "companyId"], { unique: true })
export class MessageThreadReadStateEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public threadId!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "timestamptz", nullable: true })
  public lastReadAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
