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

  /** `b2b` = iki firma; `org_channel` = şirket içi kanal (companyAId = companyBId). */
  @Column({ type: "varchar", length: 32, default: "b2b" })
  public threadKind!: "b2b" | "org_channel";

  @Column({ type: "varchar", length: 64, nullable: true })
  public channelSlug!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  public channelName!: string | null;

  @OneToMany(() => MessageEntity, (message) => message.thread)
  public messages!: MessageEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
