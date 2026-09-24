import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";

@Injectable()
export class MailCustomDomainOpenDkimInstaller {
  private readonly logger = new Logger(MailCustomDomainOpenDkimInstaller.name);

  public constructor(private readonly configService: ConfigService) {}

  public tryInstall(params: {
    domain: string;
    selector: string;
    privateKeyPem: string;
  }): { installed: boolean; detail: string } {
    const enabled =
      this.configService.get<string>("MAIL_SYNC_OPENDKIM") === "true";
    if (!enabled) {
      return {
        installed: false,
        detail: "MAIL_SYNC_OPENDKIM kapalı — VPS script ile kurun.",
      };
    }
    const opendkimDir = "/etc/opendkim";
    if (!existsSync(opendkimDir)) {
      return { installed: false, detail: "OpenDKIM dizini bulunamadı." };
    }
    const domain = params.domain;
    const selector = params.selector || "default";
    const keyDir = `${opendkimDir}/keys/${domain}`;
    mkdirSync(keyDir, { recursive: true });
    const privatePath = `${keyDir}/${selector}.private`;
    writeFileSync(privatePath, params.privateKeyPem, { encoding: "utf8", mode: 0o600 });

    const keyTableLine = `${selector}._domainkey.${domain} ${domain}:${selector}:${privatePath}`;
    const signingLine = `*@${domain} ${selector}._domainkey.${domain}`;
    const keyTablePath = `${opendkimDir}/KeyTable`;
    const signingTablePath = `${opendkimDir}/SigningTable`;
    if (!this.fileContainsLine(keyTablePath, keyTableLine)) {
      appendFileSync(keyTablePath, `${keyTableLine}\n`);
    }
    if (!this.fileContainsLine(signingTablePath, signingLine)) {
      appendFileSync(signingTablePath, `${signingLine}\n`);
    }
    try {
      execFileSync("systemctl", ["restart", "opendkim"], { stdio: "ignore" });
    } catch {
      this.logger.warn("opendkim restart başarısız — manuel kontrol edin.");
    }
    return { installed: true, detail: `OpenDKIM: ${domain} signing eklendi.` };
  }

  private fileContainsLine(path: string, line: string): boolean {
    if (!existsSync(path)) {
      return false;
    }
    return readFileSync(path, "utf8").includes(line);
  }
}
