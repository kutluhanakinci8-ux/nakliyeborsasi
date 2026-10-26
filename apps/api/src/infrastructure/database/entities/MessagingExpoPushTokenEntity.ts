import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "messaging_expo_push_token" })
@Index(["userId", "expoPushToken"], { unique: true })
export class MessagingExpoPushTokenEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public userId!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "text" })
  public expoPushToken!: string;

  @Column({ type: "varchar", length: 16 })
  public platform!: "ios" | "android";

  @Column({ type: "varchar", length: 255, nullable: true })
  public userAgent!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
