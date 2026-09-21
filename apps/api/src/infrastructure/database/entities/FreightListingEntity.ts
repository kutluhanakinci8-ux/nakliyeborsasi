import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CompanyEntity } from "./CompanyEntity";

@Entity({ name: "freight_listings" })
export class FreightListingEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public ownerCompanyId!: string;

  @Column({ type: "varchar", length: 2 })
  public originCountryCode!: string;

  @Column({ type: "varchar", length: 120 })
  public originCityName!: string;

  @Column({ type: "varchar", length: 2 })
  public destinationCountryCode!: string;

  @Column({ type: "varchar", length: 120 })
  public destinationCityName!: string;

  @Column({ type: "varchar", length: 32 })
  public equipmentTypeCode!: string;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  public weightTonnes!: string;

  @Column({ type: "date" })
  public loadingDateStart!: string;

  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  public priceAmount!: string | null;

  @Column({ type: "varchar", length: 8, nullable: true })
  public priceCurrencyCode!: string | null;

  @Column({ type: "varchar", length: 32 })
  public marketScopeCode!: string;

  @ManyToOne(() => CompanyEntity, (company) => company.freightListings, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "ownerCompanyId" })
  public ownerCompany!: CompanyEntity;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
