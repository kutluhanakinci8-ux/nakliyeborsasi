import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "user_webauthn_credential" })
@Index(["credentialId"], { unique: true })
@Index(["userId"])
export class UserWebAuthnCredentialEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "user_id", type: "uuid" })
  public userId!: string;

  @Column({ name: "credential_id", type: "text" })
  public credentialId!: string;

  @Column({ name: "public_key", type: "text" })
  public publicKey!: string;

  @Column({ type: "bigint", default: 0 })
  public counter!: string;

  @Column({ name: "device_name", type: "varchar", length: 120, nullable: true })
  public deviceName!: string | null;

  @Column({ type: "jsonb", nullable: true })
  public transports!: string[] | null;

  @Column({ name: "last_used_at", type: "timestamptz", nullable: true })
  public lastUsedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;
}
