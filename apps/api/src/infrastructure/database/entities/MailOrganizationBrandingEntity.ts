import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_organization_branding" })
export class MailOrganizationBrandingEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid", unique: true })
  public organizationId!: string;

  /** HTTPS logo URL (e-posta üst bilgisi). */
  @Column({ type: "varchar", length: 2048, nullable: true })
  public logoUrl!: string | null;

  /** E-posta üst bilgisinde gösterilen marka adı. */
  @Column({ type: "varchar", length: 120, nullable: true })
  public emailBrandTitle!: string | null;

  /**
   * Varsayılan gönderen görünen adı (From); boşsa posta kutusu kimliği kullanılır.
   */
  @Column({ type: "varchar", length: 120, nullable: true })
  public defaultFromDisplayName!: string | null;

  /** Lerta e-posta şablonu üst/alt kurumsal chrome gizle. */
  @Column({ type: "boolean", default: false })
  public hidePlatformEmailChrome!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
