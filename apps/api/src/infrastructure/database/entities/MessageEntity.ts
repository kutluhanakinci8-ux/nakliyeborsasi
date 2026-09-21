import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { MessageThreadEntity } from "./MessageThreadEntity";

@Entity({ name: "messages" })
export class MessageEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public threadId!: string;

  @Column({ type: "uuid" })
  public senderCompanyId!: string;

  @Column({ type: "uuid" })
  public senderUserId!: string;

  @Column({ type: "text" })
  public bodyText!: string;

  @ManyToOne(() => MessageThreadEntity, (thread) => thread.messages, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "threadId" })
  public thread!: MessageThreadEntity;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
