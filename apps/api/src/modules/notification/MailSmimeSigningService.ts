import { Injectable, Logger } from "@nestjs/common";
import * as forge from "node-forge";

@Injectable()
export class MailSmimeSigningService {
  private readonly logger = new Logger(MailSmimeSigningService.name);

  /**
   * PKCS#7 detached imza — S/MIME uyumlu .p7s ek dosyası.
   */
  public createDetachedSignatureAttachment(params: {
    certificatePem: string;
    privateKeyPem: string;
    canonicalContent: string;
  }): { filename: string; content: Buffer; contentType: string } | null {
    try {
      const cert = forge.pki.certificateFromPem(params.certificatePem);
      const privateKey = forge.pki.privateKeyFromPem(params.privateKeyPem);
      const p7 = forge.pkcs7.createSignedData();
      p7.content = forge.util.createBuffer(params.canonicalContent, "utf8");
      p7.addCertificate(cert);
      p7.addSigner({
        key: privateKey,
        certificate: cert,
        digestAlgorithm: forge.pki.oids.sha256,
        authenticatedAttributes: [
          {
            type: forge.pki.oids.contentType,
            value: forge.pki.oids.data,
          },
          {
            type: forge.pki.oids.messageDigest,
          },
          {
            type: forge.pki.oids.signingTime,
            value: new Date().toISOString(),
          },
        ],
      });
      p7.sign({ detached: true });
      const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
      return {
        filename: "smime.p7s",
        content: Buffer.from(der, "binary"),
        contentType: "application/pkcs7-signature",
      };
    } catch (error) {
      this.logger.warn(
        `S/MIME imza oluşturulamadı: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }
}
