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
import { FleetVehicleEntity } from "./FleetVehicleEntity";

@Entity({ name: "fleet_drivers" })
@Index(["companyId", "statusCode"])
export class FleetDriverEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @ManyToOne(() => CompanyEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "companyId" })
  public company!: CompanyEntity;

  @Column({ type: "uuid", nullable: true })
  public linkedUserAccountId!: string | null;

  @Column({ type: "varchar", length: 160 })
  public displayName!: string;

  @Column({ type: "varchar", length: 24, nullable: true })
  public primaryPhoneE164!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  public driverLicenseNumber!: string | null;

  @Column({ type: "varchar", length: 2, nullable: true })
  public driverLicenseCountryCode!: string | null;

  @Column({ type: "varchar", length: 32 })
  public statusCode!: string;

  @Column({ type: "uuid", nullable: true })
  public activeVehicleId!: string | null;

  @ManyToOne(() => FleetVehicleEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "activeVehicleId" })
  public activeVehicle!: FleetVehicleEntity | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
