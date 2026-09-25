import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type MailComposeDraftAttachmentMeta = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

@Entity({ name: "mail_compose_draft" })
export class MailComposeDraftEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "organization_id", type: "uuid" })
  public organizationId!: string;

  @Column({ name: "created_by_user_id", type: "uuid" })
  public createdByUserId!: string;

  @Column({ name: "to_address", type: "varchar", length: 320, nullable: true })
  public toAddress!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  public subject!: string | null;

  @Column({ name: "body_text", type: "text", nullable: true })
  public bodyText!: string | null;

  @Column({ type: "jsonb", nullable: true })
  public attachments!: MailComposeDraftAttachmentMeta[] | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
