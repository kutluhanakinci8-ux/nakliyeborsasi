import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "company_social_connections" })
@Index("uq_company_social_connection_platform", ["companyId", "platformCode"], {
  unique: true,
})
export class CompanySocialConnectionEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "varchar", length: 48 })
  public platformCode!: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  public externalAccountId!: string | null;

  @Column({ type: "varchar", length: 240, nullable: true })
  public displayName!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  public profileUrl!: string | null;

  @Column({ type: "varchar", length: 32 })
  public statusCode!: string;

  @Column({ type: "varchar", length: 512, nullable: true })
  public lastErrorMessage!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  public grantedScopes!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  public connectedAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  public tokenExpiresAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
