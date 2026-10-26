import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_user_inbox_category" })
export class MailUserInboxCategoryEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "organization_id", type: "uuid" })
  public organizationId!: string;

  @Column({ type: "varchar", length: 80 })
  public name!: string;

  @Column({ name: "color_key", type: "varchar", length: 24, default: "blue" })
  public colorKey!: string;

  @Column({ name: "icon_key", type: "varchar", length: 24, default: "tag" })
  public iconKey!: string;

  @Column({ name: "sort_order", type: "int", default: 0 })
  public sortOrder!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
