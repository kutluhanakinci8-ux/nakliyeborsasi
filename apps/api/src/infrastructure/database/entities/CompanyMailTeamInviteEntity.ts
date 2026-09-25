import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "company_mail_team_invites" })
@Index(["companyId", "email"])
export class CompanyMailTeamInviteEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "varchar", length: 255 })
  public email!: string;

  @Column({ type: "varchar", length: 64 })
  public roleCode!: string;

  @Column({ type: "uuid" })
  public invitedByUserId!: string;

  @Column({ type: "varchar", length: 128, unique: true })
  public tokenHash!: string;

  @Column({ type: "timestamptz" })
  public expiresAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  public acceptedAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  public revokedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
