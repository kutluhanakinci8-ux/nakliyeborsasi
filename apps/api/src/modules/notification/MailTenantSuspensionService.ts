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

  public async setBillingAutomatedSuspend(
    organizationId: string,
    reason: string,
  ): Promise<void> {
    const row = await this.findOrCreate(organizationId);
    row.suspended = true;
    row.suspendReason = reason.trim() || "Ödeme gecikmesi — gönderim askıda";
    row.suspendedAt = new Date();
    await this.stateRepository.save(row);
  }

  public async clearBillingAutomatedSuspend(
    organizationId: string,
  ): Promise<void> {
    const row = await this.stateRepository.findOne({
      where: { organizationId },
    });
    if (!row?.suspended) {
      return;
    }
    const reason = row.suspendReason?.trim() ?? "";
    if (
      reason.startsWith("billing:") ||
      reason.includes("Ödeme gecikmesi")
    ) {
      row.suspended = false;
      row.suspendReason = null;
      row.suspendedAt = null;
      await this.stateRepository.save(row);
    }
  }

  private async findOrCreate(
    organizationId: string,
  ): Promise<MailOrganizationOperatorStateEntity> {
    const existing = await this.stateRepository.findOne({
      where: { organizationId },
    });
    if (existing) {
      return existing;
    }
    return this.stateRepository.save(
      this.stateRepository.create({ organizationId, suspended: false }),
    );
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
