import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "fleet_route_matching_jobs" })
@Index(["statusCode", "createdAt"])
@Index(["fleetDriverId", "windowStart", "windowEnd"])
export class FleetRouteMatchingJobEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "uuid" })
  public fleetDriverId!: string;

  @Column({ type: "varchar", length: 36, nullable: true })
  public tripCorrelationId!: string | null;

  @Column({ type: "timestamptz" })
  public windowStart!: Date;

  @Column({ type: "timestamptz" })
  public windowEnd!: Date;

  @Column({ type: "varchar", length: 16 })
  public statusCode!: string;

  @Column({ type: "int", default: 0 })
  public attemptCount!: number;

  @Column({ type: "text", nullable: true })
  public lastError!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
