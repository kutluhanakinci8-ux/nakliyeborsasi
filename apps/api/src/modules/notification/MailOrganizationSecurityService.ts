import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserTotpService } from "../auth/UserTotpService";
import { MailOrganizationOperatorStateEntity } from "../../infrastructure/database/entities/MailOrganizationOperatorStateEntity";

@Injectable()
export class MailOrganizationSecurityService {
  public constructor(
    private readonly userTotpService: UserTotpService,
    @InjectRepository(MailOrganizationOperatorStateEntity)
    private readonly operatorStateRepository: Repository<MailOrganizationOperatorStateEntity>,
  ) {}

  public async getSecurityPolicy(organizationId: string) {
    const row = await this.operatorStateRepository.findOne({
      where: { organizationId },
    });
    return {
      requireTotpForConsole: row?.requireTotpForConsole ?? false,
    };
  }

  public async setRequireTotpForConsole(
    organizationId: string,
    requireTotpForConsole: boolean,
  ) {
    let row = await this.operatorStateRepository.findOne({
      where: { organizationId },
    });
    if (!row) {
      row = this.operatorStateRepository.create({
        organizationId,
        suspended: false,
        abuseFlag: false,
        requireTotpForConsole,
      });
    } else {
      row.requireTotpForConsole = requireTotpForConsole;
    }
    await this.operatorStateRepository.save(row);
    return this.getSecurityPolicy(organizationId);
  }

  public async assertConsoleTotpPolicy(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const policy = await this.getSecurityPolicy(organizationId);
    if (!policy.requireTotpForConsole) {
      return;
    }
    const enabled = await this.userTotpService.isEnabled(userId);
    if (!enabled) {
      throw new ForbiddenException(
        "Firma politikası iki adımlı doğrulama gerektiriyor. Önce hesabınızda TOTP açın (/security veya webmail ayarları).",
      );
    }
  }
}
