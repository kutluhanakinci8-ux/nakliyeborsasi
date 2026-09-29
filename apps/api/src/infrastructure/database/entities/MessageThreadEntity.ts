import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { MessageEntity } from "./MessageEntity";

@Entity({ name: "message_threads" })
export class MessageThreadEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyAId!: string;

  @Column({ type: "uuid" })
  public companyBId!: string;

  @Column({ type: "uuid", nullable: true })
  public freightListingId!: string | null;

  @Column({ name: "thread_kind", type: "varchar", length: 16, default: "pair" })
  public threadKind!: "pair" | "group";

  @Column({ type: "varchar", length: 120, nullable: true })
  public title!: string | null;

  @OneToMany(() => MessageEntity, (message) => message.thread)
  public messages!: MessageEntity[];

  @Column({ name: "legal_hold_at", type: "timestamptz", nullable: true })
  public legalHoldAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
