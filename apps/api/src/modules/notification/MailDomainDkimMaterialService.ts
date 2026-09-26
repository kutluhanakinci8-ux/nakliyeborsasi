import { Injectable, Logger } from "@nestjs/common";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

@Injectable()
export class MailDomainDkimMaterialService {
  private readonly logger = new Logger(MailDomainDkimMaterialService.name);

  public generateForDomain(domain: string): {
    dkimTxt: string;
    privateKeyPem: string;
  } | null {
    try {
      const dir = mkdtempSync(join(tmpdir(), "lerta-dkim-"));
      try {
        execFileSync(
          "opendkim-genkey",
          ["-b", "1024", "-d", domain, "-s", "default", "-D", dir],
          { stdio: "pipe" },
        );
        const rawTxt = readFileSync(join(dir, "default.txt"), "utf8");
        const flat = rawTxt.replace(/[\n\r"]/g, "").replace(/\s+/g, " ");
        const dkimMatch = flat.match(
          /(v=DKIM1;[^;]+;[^;]+; p=[A-Za-z0-9+/=]+)/,
        );
        const txt = dkimMatch?.[1] ?? flat;
        const privateKeyPem = readFileSync(join(dir, "default.private"), "utf8");
        const dkimTxt = txt.includes("v=DKIM1")
          ? txt
          : `v=DKIM1; k=rsa; p=${txt}`;
        return { dkimTxt, privateKeyPem };
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.warn(
        `opendkim-genkey başarısız (${domain}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}
