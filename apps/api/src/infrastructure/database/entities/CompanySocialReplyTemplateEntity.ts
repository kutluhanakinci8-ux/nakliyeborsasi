import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "company_social_reply_templates" })
@Index("idx_company_social_templates_company", ["companyId"])
export class CompanySocialReplyTemplateEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "varchar", length: 120 })
  public title!: string;

  @Column({ type: "text" })
  public bodyText!: string;

  /** Boş = tüm kanallar; aksi halde SocialPlatformCode */
  @Column({ type: "varchar", length: 48, nullable: true })
  public channelScopeCode!: string | null;

  @Column({ type: "int", default: 0 })
  public sortOrder!: number;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
