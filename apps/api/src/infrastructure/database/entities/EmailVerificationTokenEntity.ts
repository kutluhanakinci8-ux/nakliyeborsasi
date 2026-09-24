import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "email_verification_tokens" })
export class EmailVerificationTokenEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public userId!: string;

  @Column({ type: "varchar", length: 128, unique: true })
  public tokenHash!: string;

  @Column({ type: "timestamptz" })
  public expiresAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  public consumedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
