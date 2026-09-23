import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CompanyEntity } from "./CompanyEntity";
import { FleetDriverEntity } from "./FleetDriverEntity";

@Entity({ name: "fleet_telemetry_devices" })
@Index(["fleetDriverId", "consentRevokedAt"])
@Index(["ingestTokenHash"], { unique: true })
export class FleetTelemetryDeviceEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @ManyToOne(() => CompanyEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "companyId" })
  public company!: CompanyEntity;

  @Column({ type: "uuid" })
  public fleetDriverId!: string;

  @ManyToOne(() => FleetDriverEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "fleetDriverId" })
  public fleetDriver!: FleetDriverEntity;

  @Column({ type: "varchar", length: 32 })
  public platformCode!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  public deviceLabel!: string | null;

  @Column({ type: "varchar", length: 64 })
  public ingestTokenHash!: string;

  @Column({ type: "varchar", length: 32 })
  public consentDocumentVersion!: string;

  @Column({ type: "timestamptz", nullable: true })
  public consentGrantedAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  public consentRevokedAt!: Date | null;

  @Column({ type: "boolean", default: false })
  public trackingEnabled!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  public lastSeenAt!: Date | null;

  @Column({ type: "double precision", nullable: true })
  public lastLatitude!: number | null;

  @Column({ type: "double precision", nullable: true })
  public lastLongitude!: number | null;

  @Column({ type: "double precision", nullable: true })
  public lastSpeedKmh!: number | null;

  @Column({ type: "varchar", length: 36, nullable: true })
  public activeTripCorrelationId!: string | null;

  /** Idle / heading debounce state for TelemetryMotionInterpreter. */
  @Column({ type: "jsonb", nullable: true })
  public interpreterStateJson!: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
