import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { FleetDriverEntity } from "./FleetDriverEntity";
import { FleetTelemetryDeviceEntity } from "./FleetTelemetryDeviceEntity";

@Entity({ name: "fleet_telemetry_consent_logs" })
@Index(["fleetDriverId", "createdAt"])
export class FleetTelemetryConsentLogEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public fleetDriverId!: string;

  @ManyToOne(() => FleetDriverEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "fleetDriverId" })
  public fleetDriver!: FleetDriverEntity;

  @Column({ type: "uuid", nullable: true })
  public deviceId!: string | null;

  @ManyToOne(() => FleetTelemetryDeviceEntity, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "deviceId" })
  public device!: FleetTelemetryDeviceEntity | null;

  @Column({ type: "varchar", length: 16 })
  public actionCode!: string;

  @Column({ type: "varchar", length: 32 })
  public consentDocumentVersion!: string;

  @Column({ type: "jsonb" })
  public purposesJson!: string[];

  @Column({ type: "varchar", length: 64, nullable: true })
  public clientIpHash!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
