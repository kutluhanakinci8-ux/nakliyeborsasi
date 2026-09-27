import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "messaging_web_push_subscription" })
@Index(["userId", "endpoint"], { unique: true })
export class MessagingWebPushSubscriptionEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public userId!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "text" })
  public endpoint!: string;

  @Column({ type: "text" })
  public p256dh!: string;

  @Column({ type: "text" })
  public auth!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  public userAgent!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
