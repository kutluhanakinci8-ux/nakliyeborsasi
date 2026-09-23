import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CompanyEntity } from "./CompanyEntity";
import { FleetDriverEntity } from "./FleetDriverEntity";
import { FleetVehicleEntity } from "./FleetVehicleEntity";

@Entity({ name: "fleet_driver_vehicle_assignments" })
@Index(["companyId", "validTo"])
export class FleetDriverVehicleAssignmentEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @ManyToOne(() => CompanyEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "companyId" })
  public company!: CompanyEntity;

  @Column({ type: "uuid" })
  public driverId!: string;

  @ManyToOne(() => FleetDriverEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "driverId" })
  public driver!: FleetDriverEntity;

  @Column({ type: "uuid" })
  public vehicleId!: string;

  @ManyToOne(() => FleetVehicleEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "vehicleId" })
  public vehicle!: FleetVehicleEntity;

  @Column({ type: "varchar", length: 32 })
  public assignmentTypeCode!: string;

  @Column({ type: "timestamptz" })
  public validFrom!: Date;

  @Column({ type: "timestamptz", nullable: true })
  public validTo!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
