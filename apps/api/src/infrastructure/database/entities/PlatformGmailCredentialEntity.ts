import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "platform_gmail_credentials" })
export class PlatformGmailCredentialEntity {
  @PrimaryColumn({ type: "varchar", length: 32, default: "default" })
  public id!: string;

  @Column({ type: "varchar", length: 320 })
  public emailAddress!: string;

  @Column({ type: "text" })
  public refreshToken!: string;

  @Column({ type: "varchar", length: 512, nullable: true })
  public scope!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public connectedAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
