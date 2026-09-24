import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from "typeorm";

@Entity({ name: "email_outbox_click_tokens" })
@Index(["outboxId"])
export class EmailOutboxClickTokenEntity {
  @PrimaryColumn({ type: "varchar", length: 32 })
  public token!: string;

  @Column({ type: "uuid" })
  public outboxId!: string;

  @Column({ type: "text" })
  public targetUrl!: string;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
