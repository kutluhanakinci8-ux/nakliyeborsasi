import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";
import type { MailInboxCategory } from "../../../modules/notification/MailInboxCategoryCatalog";

@Entity({ name: "mail_inbox_category_override" })
export class MailInboxCategoryOverrideEntity {
  @PrimaryColumn({ name: "organization_id", type: "uuid" })
  public organizationId!: string;

  @PrimaryColumn({ name: "from_address_lower", type: "varchar", length: 320 })
  public fromAddressLower!: string;

  @Column({ name: "inbox_category", type: "varchar", length: 32, nullable: true })
  public inboxCategory!: MailInboxCategory | null;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
