import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_mailbox" })
export class MailMailboxEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public organizationId!: string;

  @Column({ type: "varchar", length: 320 })
  public emailAddress!: string;

  @Column({ type: "varchar", length: 16, default: "active" })
  public status!: "active" | "suspended";

  @Column({ type: "bigint", default: 0 })
  public quotaBytes!: string;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
