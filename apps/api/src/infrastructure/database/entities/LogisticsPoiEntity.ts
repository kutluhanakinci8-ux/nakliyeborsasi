import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "logistics_poi" })
@Index(["kindCode", "latitude", "longitude"])
@Index(["countryCode", "kindCode"])
@Index(["sourceCode", "externalId"], { unique: true })
export class LogisticsPoiEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "varchar", length: 32 })
  public kindCode!: string;

  @Column({ type: "varchar", length: 256 })
  public displayName!: string;

  @Column({ type: "double precision" })
  public latitude!: number;

  @Column({ type: "double precision" })
  public longitude!: number;

  @Column({ type: "varchar", length: 8, default: "TR" })
  public countryCode!: string;

  @Column({ type: "varchar", length: 16 })
  public sourceCode!: string;

  @Column({ type: "varchar", length: 64 })
  public externalId!: string;

  @Column({ type: "varchar", length: 32 })
  public datasetVersion!: string;

  @Column({ type: "jsonb", nullable: true })
  public metadataJson!: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
