import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetTelemetryDeviceEntity } from "./FleetTelemetryDeviceEntity";
import { FleetDriverEntity } from "./FleetDriverEntity";
import { CompanyEntity } from "./CompanyEntity";

@Entity({ name: "fleet_telemetry_events" })
@Index(["deviceId", "recordedAt"])
@Index(["fleetDriverId", "recordedAt"])
@Index(["companyId", "eventTypeCode", "recordedAt"])
export class FleetTelemetryEventEntity {
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

  @Column({ type: "uuid" })
  public deviceId!: string;

  @ManyToOne(() => FleetTelemetryDeviceEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "deviceId" })
  public device!: FleetTelemetryDeviceEntity;

  @Column({ type: "varchar", length: 48 })
  public eventTypeCode!: string;

  @Column({ type: "timestamptz" })
  public recordedAt!: Date;

  @Column({ type: "double precision", nullable: true })
  public latitude!: number | null;

  @Column({ type: "double precision", nullable: true })
  public longitude!: number | null;

  @Column({ type: "double precision", nullable: true })
  public speedKmh!: number | null;

  @Column({ type: "double precision", nullable: true })
  public headingDegrees!: number | null;

  @Column({ type: "double precision", nullable: true })
  public horizontalAccuracyMeters!: number | null;

  @Column({ type: "varchar", length: 16, nullable: true })
  public severityCode!: string | null;

  @Column({ type: "varchar", length: 36, nullable: true })
  public tripCorrelationId!: string | null;

  @Column({ type: "jsonb", nullable: true })
  public payloadJson!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  public ingestBatchId!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
