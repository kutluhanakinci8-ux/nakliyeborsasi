import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AuctionBidEntity } from "./AuctionBidEntity";

@Entity({ name: "auction_sessions" })
export class AuctionSessionEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public freightListingId!: string;

  @Column({ type: "uuid" })
  public ownerCompanyId!: string;

  @Column({ type: "varchar", length: 16 })
  public statusCode!: string;

  @Column({ type: "timestamptz" })
  public endsAt!: Date;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  public minimumBidAmount!: string;

  @Column({ type: "varchar", length: 8 })
  public currencyCode!: string;

  @Column({ type: "uuid", nullable: true })
  public winningBidId!: string | null;

  /** Taşıma / ihale şart özeti (şartname metni). */
  @Column({ type: "text", nullable: true })
  public termsSummary!: string | null;

  /** Şartname PDF veya harici belge URL. */
  @Column({ type: "varchar", length: 512, nullable: true })
  public specDocumentUrl!: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  public specDocumentLabel!: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  public paymentFormCode!: string | null;

  @Column({ type: "int", nullable: true })
  public paymentDeferDays!: number | null;

  @Column({ type: "boolean", default: false })
  public priceIncludesVat!: boolean;

  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  public bidStepAmount!: string | null;

  @Column({ type: "text", nullable: true })
  public cargoDescription!: string | null;

  @OneToMany(() => AuctionBidEntity, (bid) => bid.auctionSession)
  public bids!: AuctionBidEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
