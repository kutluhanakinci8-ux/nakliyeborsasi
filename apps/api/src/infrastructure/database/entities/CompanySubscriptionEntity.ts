import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CompanyEntity } from "./CompanyEntity";
import { SubscriptionPlanEntity } from "./SubscriptionPlanEntity";

@Entity({ name: "company_subscriptions" })
export class CompanySubscriptionEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "varchar", length: 64 })
  public planCode!: string;

  @Column({ type: "boolean", default: true })
  public isActive!: boolean;

  @ManyToOne(() => CompanyEntity, (company) => company.subscriptions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "companyId" })
  public company!: CompanyEntity;

  @ManyToOne(() => SubscriptionPlanEntity, (plan) => plan.companySubscriptions)
  @JoinColumn({ name: "planCode" })
  public plan!: SubscriptionPlanEntity;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
