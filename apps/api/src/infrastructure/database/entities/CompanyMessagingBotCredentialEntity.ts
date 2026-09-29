import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "company_messaging_bot_credential" })
export class CompanyMessagingBotCredentialEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "company_id", type: "uuid" })
  public companyId!: string;

  @Column({ type: "varchar", length: 80 })
  public label!: string;

  @Column({ name: "bot_user_id", type: "uuid" })
  public botUserId!: string;

  @Column({ name: "token_prefix", type: "varchar", length: 24 })
  public tokenPrefix!: string;

  @Column({ name: "token_hash", type: "varchar", length: 64 })
  public tokenHash!: string;

  @Column({ type: "jsonb", default: () => `'["messaging:read","messaging:write"]'` })
  public scopes!: string[];

  @Column({ name: "last_used_at", type: "timestamptz", nullable: true })
  public lastUsedAt!: Date | null;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  public revokedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;
}
