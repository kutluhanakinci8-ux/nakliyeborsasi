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

  @OneToMany(() => MessageEntity, (message) => message.thread)
  public messages!: MessageEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
