import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CompanyMembershipEntity } from "./CompanyMembershipEntity";
import { CompanySubscriptionEntity } from "./CompanySubscriptionEntity";
import { FreightListingEntity } from "./FreightListingEntity";

@Entity({ name: "companies" })
export class CompanyEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "varchar", length: 255 })
  public legalName!: string;

  @Column({ type: "varchar", length: 2 })
  public countryCode!: string;

  /** LOAD_SHIPPER | LOAD_CARRIER | LOAD_SEEKER */
  @Column({ type: "varchar", length: 32, nullable: true })
  public participantTypeCode!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  public websiteUrl!: string | null;

  @OneToMany(() => CompanyMembershipEntity, (membership) => membership.company)
  public memberships!: CompanyMembershipEntity[];

  @OneToMany(() => CompanySubscriptionEntity, (subscription) => subscription.company)
  public subscriptions!: CompanySubscriptionEntity[];

  @OneToMany(() => FreightListingEntity, (listing) => listing.ownerCompany)
  public freightListings!: FreightListingEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
