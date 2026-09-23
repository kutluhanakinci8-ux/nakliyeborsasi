import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "fleet_matched_routes" })
@Index(["fleetDriverId", "windowStart", "windowEnd"])
@Index(["companyId", "matchedAt"])
export class FleetMatchedRouteEntity {
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

  @Column({ type: "jsonb" })
  public geometryJson!: { type: "LineString"; coordinates: number[][] };

  @Column({ type: "jsonb", nullable: true })
  public speedSegmentsJson!: Array<{
    coordinates: [number, number][];
    speedKmh: number;
  }> | null;

  @Column({ type: "int" })
  public sourcePointCount!: number;

  @Column({ type: "double precision", nullable: true })
  public distanceKm!: number | null;

  @Column({ type: "varchar", length: 32 })
  public providerCode!: string;

  @Column({ type: "timestamptz" })
  public matchedAt!: Date;

  @Column({ type: "varchar", length: 64 })
  public inputFingerprint!: string;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
