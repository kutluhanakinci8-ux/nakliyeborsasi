import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_inbox_rule" })
@Index(["organizationId", "sortOrder"])
export class MailInboxRuleEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public organizationId!: string;

  @Column({ type: "varchar", length: 80 })
  public name!: string;

  @Column({ type: "int", default: 0 })
  public sortOrder!: number;

  @Column({ type: "boolean", default: true })
  public enabled!: boolean;

  @Column({ type: "varchar", length: 320, nullable: true })
  public fromContains!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  public subjectContains!: string | null;

  @Column({ name: "to_contains", type: "varchar", length: 320, nullable: true })
  public toContains!: string | null;

  @Column({ name: "require_attachment", type: "boolean", default: false })
  public requireAttachment!: boolean;

  @Column({ type: "boolean", default: false })
  public actionStar!: boolean;

  @Column({ type: "uuid", nullable: true })
  public actionCustomFolderId!: string | null;

  @Column({ type: "boolean", default: false })
  public actionArchive!: boolean;

  @Column({ type: "boolean", default: false })
  public actionMarkRead!: boolean;

  @Column({ type: "boolean", default: false })
  public actionTrash!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
