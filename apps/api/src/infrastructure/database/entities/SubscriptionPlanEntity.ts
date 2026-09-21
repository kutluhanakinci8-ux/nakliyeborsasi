import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { CompanySubscriptionEntity } from "./CompanySubscriptionEntity";

@Entity({ name: "subscription_plans" })
export class SubscriptionPlanEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  public planCode!: string;

  @Column({ type: "varchar", length: 32 })
  public tierCode!: string;

  @Column({ type: "jsonb" })
  public includedModuleCodes!: string[];

  @Column({ type: "int" })
  public maxConcurrentSearchTabs!: number;

  @Column({ type: "int" })
  public laneAnalyticsHistoryDays!: number;

  @OneToMany(() => CompanySubscriptionEntity, (subscription) => subscription.plan)
  public companySubscriptions!: CompanySubscriptionEntity[];
}
