import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "platform_gmail_oauth_states" })
export class PlatformGmailOAuthStateEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  public state!: string;

  @Column({ type: "uuid" })
  public operatorUserId!: string;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
