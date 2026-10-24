import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "user_mail_crypto_settings" })
export class UserMailCryptoSettingsEntity {
  @PrimaryColumn({ name: "user_id", type: "uuid" })
  public userId!: string;

  @Column({ name: "pgp_public_key_armored", type: "text", nullable: true })
  public pgpPublicKeyArmored!: string | null;

  @Column({ name: "pgp_key_fingerprint", type: "varchar", length: 64, nullable: true })
  public pgpKeyFingerprint!: string | null;

  @Column({ name: "smime_certificate_pem", type: "text", nullable: true })
  public smimeCertificatePem!: string | null;

  @Column({ name: "smime_private_key_enc", type: "text", nullable: true })
  public smimePrivateKeyEnc!: string | null;

  @Column({ name: "outbound_sign_smime", type: "boolean", default: false })
  public outboundSignSmime!: boolean;

  @Column({ name: "compose_prefer_pgp", type: "boolean", default: false })
  public composePreferPgp!: boolean;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
