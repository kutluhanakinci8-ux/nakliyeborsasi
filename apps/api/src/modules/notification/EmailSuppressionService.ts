import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailSuppressionEntity } from "../../infrastructure/database/entities/EmailSuppressionEntity";

@Injectable()
export class EmailSuppressionService {
  public constructor(
    @InjectRepository(EmailSuppressionEntity)
    private readonly repository: Repository<EmailSuppressionEntity>,
  ) {}

  public normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  public async isSuppressed(email: string): Promise<boolean> {
    const row = await this.repository.findOne({
      where: { emailAddress: this.normalizeEmail(email) },
    });
    return Boolean(row);
  }

  public async addSuppression(params: {
    email: string;
    reason: string;
    source: string;
    note?: string;
  }): Promise<EmailSuppressionEntity> {
    const emailAddress = this.normalizeEmail(params.email);
    const existing = await this.repository.findOne({
      where: { emailAddress },
    });
    if (existing) {
      existing.reason = params.reason;
      existing.source = params.source;
      existing.note = params.note ?? existing.note;
      return this.repository.save(existing);
    }
    return this.repository.save(
      this.repository.create({
        emailAddress,
        reason: params.reason,
        source: params.source,
        note: params.note ?? null,
      }),
    );
  }

  public async removeSuppression(email: string): Promise<boolean> {
    const result = await this.repository.delete({
      emailAddress: this.normalizeEmail(email),
    });
    return (result.affected ?? 0) > 0;
  }

  public async list(limit = 200): Promise<EmailSuppressionEntity[]> {
    return this.repository.find({
      order: { updatedAt: "DESC" },
      take: Math.min(limit, 500),
    });
  }
}
