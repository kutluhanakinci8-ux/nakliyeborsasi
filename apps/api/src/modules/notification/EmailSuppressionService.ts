import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailSuppressionEntity } from "../../infrastructure/database/entities/EmailSuppressionEntity";
import { EmailOrganizationSuppressionEntity } from "../../infrastructure/database/entities/EmailOrganizationSuppressionEntity";

@Injectable()
export class EmailSuppressionService {
  public constructor(
    @InjectRepository(EmailSuppressionEntity)
    private readonly platformRepository: Repository<EmailSuppressionEntity>,
    @InjectRepository(EmailOrganizationSuppressionEntity)
    private readonly organizationRepository: Repository<EmailOrganizationSuppressionEntity>,
  ) {}

  public normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  public async isSuppressed(
    email: string,
    organizationId?: string | null,
  ): Promise<boolean> {
    const emailAddress = this.normalizeEmail(email);
    const globalRow = await this.platformRepository.findOne({
      where: { emailAddress },
    });
    if (globalRow) {
      return true;
    }
    if (!organizationId?.trim()) {
      return false;
    }
    const orgRow = await this.organizationRepository.findOne({
      where: {
        organizationId: organizationId.trim(),
        emailAddress,
      },
    });
    return Boolean(orgRow);
  }

  public async addSuppression(params: {
    email: string;
    reason: string;
    source: string;
    note?: string;
    organizationId?: string | null;
  }): Promise<EmailSuppressionEntity | EmailOrganizationSuppressionEntity> {
    const emailAddress = this.normalizeEmail(params.email);
    if (params.organizationId?.trim()) {
      return this.addOrganizationSuppression({
        organizationId: params.organizationId.trim(),
        email: emailAddress,
        reason: params.reason,
        source: params.source,
        note: params.note,
      });
    }
    const existing = await this.platformRepository.findOne({
      where: { emailAddress },
    });
    if (existing) {
      existing.reason = params.reason;
      existing.source = params.source;
      existing.note = params.note ?? existing.note;
      return this.platformRepository.save(existing);
    }
    return this.platformRepository.save(
      this.platformRepository.create({
        emailAddress,
        reason: params.reason,
        source: params.source,
        note: params.note ?? null,
      }),
    );
  }

  public async addOrganizationSuppression(params: {
    organizationId: string;
    email: string;
    reason: string;
    source: string;
    note?: string;
  }): Promise<EmailOrganizationSuppressionEntity> {
    const emailAddress = this.normalizeEmail(params.email);
    const existing = await this.organizationRepository.findOne({
      where: {
        organizationId: params.organizationId,
        emailAddress,
      },
    });
    if (existing) {
      existing.reason = params.reason;
      existing.source = params.source;
      existing.note = params.note ?? existing.note;
      return this.organizationRepository.save(existing);
    }
    return this.organizationRepository.save(
      this.organizationRepository.create({
        organizationId: params.organizationId,
        emailAddress,
        reason: params.reason,
        source: params.source,
        note: params.note ?? null,
      }),
    );
  }

  public async removeSuppression(
    email: string,
    organizationId?: string | null,
  ): Promise<boolean> {
    const emailAddress = this.normalizeEmail(email);
    if (organizationId?.trim()) {
      const result = await this.organizationRepository.delete({
        organizationId: organizationId.trim(),
        emailAddress,
      });
      return (result.affected ?? 0) > 0;
    }
    const result = await this.platformRepository.delete({ emailAddress });
    return (result.affected ?? 0) > 0;
  }

  public async listPlatform(limit = 200): Promise<EmailSuppressionEntity[]> {
    return this.platformRepository.find({
      order: { updatedAt: "DESC" },
      take: Math.min(limit, 500),
    });
  }

  public async listForOrganization(
    organizationId: string,
    limit = 200,
  ): Promise<EmailOrganizationSuppressionEntity[]> {
    return this.organizationRepository.find({
      where: { organizationId },
      order: { updatedAt: "DESC" },
      take: Math.min(limit, 500),
    });
  }

  /** @deprecated use listPlatform */
  public async list(limit = 200): Promise<EmailSuppressionEntity[]> {
    return this.listPlatform(limit);
  }
}
