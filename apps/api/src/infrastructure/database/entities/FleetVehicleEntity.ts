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

@Entity({ name: "fleet_vehicles" })
@Index(["companyId", "registrationCountryCode", "licensePlateNormalized"], {
  unique: true,
})
export class FleetVehicleEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @ManyToOne(() => CompanyEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "companyId" })
  public company!: CompanyEntity;

  @Column({ type: "varchar", length: 2 })
  public registrationCountryCode!: string;

  @Column({ type: "varchar", length: 24 })
  public licensePlateNormalized!: string;

  @Column({ type: "varchar", length: 32 })
  public licensePlateDisplay!: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  public vin!: string | null;

  @Column({ type: "varchar", length: 32 })
  public equipmentTypeCode!: string;

  @Column({ type: "numeric", precision: 8, scale: 2, nullable: true })
  public payloadCapacityTonnes!: string | null;

  @Column({ type: "varchar", length: 32 })
  public statusCode!: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  public internalFleetNumber!: string | null;

  @Column({ type: "uuid", nullable: true })
  public activeDriverId!: string | null;

  @ManyToOne(() => FleetDriverEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "activeDriverId" })
  public activeDriver!: FleetDriverEntity | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
