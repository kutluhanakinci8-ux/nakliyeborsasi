import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailOrganizationOperatorStateEntity } from "../../infrastructure/database/entities/MailOrganizationOperatorStateEntity";

@Injectable()
export class MailTenantSuspensionService {
  public constructor(
    @InjectRepository(MailOrganizationOperatorStateEntity)
    private readonly stateRepository: Repository<MailOrganizationOperatorStateEntity>,
  ) {}

  public async assertOrganizationCanSend(organizationId: string): Promise<void> {
    const row = await this.stateRepository.findOne({
      where: { organizationId },
    });
    if (row?.suspended) {
      throw new ForbiddenException(
        row.suspendReason?.trim() ||
          "Bu kurumsal posta hesabı operatör tarafından askıya alındı.",
      );
    }
  }

  public async getOperatorState(organizationId: string) {
    const row = await this.stateRepository.findOne({
      where: { organizationId },
    });
    return {
      suspended: row?.suspended ?? false,
      suspendReason: row?.suspendReason ?? null,
      abuseFlag: row?.abuseFlag ?? false,
      operatorNote: row?.operatorNote ?? null,
      suspendedAt: row?.suspendedAt?.toISOString() ?? null,
    };
  }
}
