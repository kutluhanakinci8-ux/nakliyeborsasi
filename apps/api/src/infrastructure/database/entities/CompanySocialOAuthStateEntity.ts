import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "company_social_oauth_states" })
@Index("idx_social_oauth_state_token", ["stateToken"], { unique: true })
export class CompanySocialOAuthStateEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "varchar", length: 128 })
  public stateToken!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "varchar", length: 48 })
  public platformCode!: string;

  /** Ephemeral PKCE verifier (X OAuth 2.0), single-use within TTL. */
  @Column({ type: "varchar", length: 128, nullable: true })
  public pkceVerifier!: string | null;

  @Column({ type: "timestamptz" })
  public expiresAt!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
