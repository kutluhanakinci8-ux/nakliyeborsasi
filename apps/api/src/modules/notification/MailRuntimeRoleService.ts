import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type LertaMailRuntimeRole = "all" | "api" | "worker";

export type MailRuntimeRoleSnapshot = {
  role: LertaMailRuntimeRole;
  backgroundJobsEnabled: boolean;
  detailTr: string;
};

@Injectable()
export class MailRuntimeRoleService {
  public constructor(private readonly configService: ConfigService) {}

  public getRole(): LertaMailRuntimeRole {
    const raw = this.configService
      .get<string>("LERTA_MAIL_RUNTIME_ROLE")
      ?.trim()
      .toLowerCase();
    if (raw === "api" || raw === "worker") {
      return raw;
    }
    return "all";
  }

  /** Outbox drain, DNS sync, billing grace, SMTP periodic verify, Postfix bootstrap */
  public shouldRunBackgroundJobs(): boolean {
    const role = this.getRole();
    return role === "all" || role === "worker";
  }

  public getSnapshot(): MailRuntimeRoleSnapshot {
    const role = this.getRole();
    const backgroundJobsEnabled = this.shouldRunBackgroundJobs();
    const detailTr =
      role === "all"
        ? "Tek düğüm: API ve arka plan işleri birlikte"
        : role === "api"
          ? "API düğümü: arka plan işleri kapalı (worker düğümü gerekli)"
          : "Worker düğümü: outbox ve mail VPS görevleri aktif";
    return { role, backgroundJobsEnabled, detailTr };
  }
}
