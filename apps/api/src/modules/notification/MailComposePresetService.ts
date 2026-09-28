import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import {
  MailComposePresetEntity,
  MailComposePresetKind,
} from "../../infrastructure/database/entities/MailComposePresetEntity";

@Injectable()
export class MailComposePresetService {
  private static readonly maxPerKind = 30;

  public constructor(
    @InjectRepository(MailComposePresetEntity)
    private readonly presetRepository: Repository<MailComposePresetEntity>,
  ) {}

  public async listForUser(
    organizationId: string,
    userId: string,
  ): Promise<{
    signatures: ReturnType<MailComposePresetService["toDto"]>[];
    templates: ReturnType<MailComposePresetService["toDto"]>[];
  }> {
    await this.ensureStarterTemplates(organizationId);
    const rows = await this.presetRepository.find({
      where: { organizationId },
      order: { updatedAt: "DESC" },
      take: 200,
    });
    const signatures = rows
      .filter(
        (row) =>
          row.kind === "signature" &&
          (row.ownerUserId === userId || row.ownerUserId === null),
      )
      .map((row) => this.toDto(row));
    const templates = rows
      .filter((row) => row.kind === "template")
      .map((row) => this.toDto(row));
    return { signatures, templates };
  }

  public async create(
    organizationId: string,
    userId: string,
    input: {
      kind: MailComposePresetKind;
      name: string;
      subject?: string;
      bodyText: string;
      isDefault?: boolean;
    },
    canManageOrgTemplates: boolean,
  ): Promise<ReturnType<MailComposePresetService["toDto"]>> {
    if (input.kind === "template" && !canManageOrgTemplates) {
      throw new ForbiddenException(
        "Şablon oluşturmak için posta yöneticisi yetkisi gerekir.",
      );
    }
    if (input.kind === "template" && !input.subject?.trim()) {
      throw new BadRequestException("Şablon için konu zorunlu.");
    }
    const existingCount = await this.presetRepository.count({
      where: {
        organizationId,
        kind: input.kind,
        ...(input.kind === "signature"
          ? { ownerUserId: userId }
          : { ownerUserId: IsNull() }),
      },
    });
    if (existingCount >= MailComposePresetService.maxPerKind) {
      throw new BadRequestException("Bu tür için kayıt limitine ulaşıldı.");
    }
    const row = await this.presetRepository.save(
      this.presetRepository.create({
        organizationId,
        ownerUserId: input.kind === "signature" ? userId : null,
        kind: input.kind,
        name: input.name.trim(),
        subject:
          input.kind === "template" ? input.subject?.trim() ?? null : null,
        bodyText: input.bodyText.trim(),
        isDefault: Boolean(input.isDefault),
      }),
    );
    if (row.isDefault && row.kind === "signature") {
      await this.clearOtherDefaultSignatures(organizationId, userId, row.id);
    }
    return this.toDto(row);
  }

  public async update(
    organizationId: string,
    userId: string,
    presetId: string,
    input: {
      name?: string;
      subject?: string;
      bodyText?: string;
      isDefault?: boolean;
    },
    canManageOrgTemplates: boolean,
  ): Promise<ReturnType<MailComposePresetService["toDto"]>> {
    const row = await this.assertAccess(
      organizationId,
      userId,
      presetId,
      canManageOrgTemplates,
    );
    if (input.name !== undefined) {
      row.name = input.name.trim();
    }
    if (input.bodyText !== undefined) {
      row.bodyText = input.bodyText.trim();
    }
    if (row.kind === "template" && input.subject !== undefined) {
      row.subject = input.subject.trim();
    }
    if (input.isDefault !== undefined) {
      row.isDefault = input.isDefault;
    }
    const saved = await this.presetRepository.save(row);
    if (saved.isDefault && saved.kind === "signature") {
      await this.clearOtherDefaultSignatures(
        organizationId,
        userId,
        saved.id,
      );
    }
    return this.toDto(saved);
  }

  public async delete(
    organizationId: string,
    userId: string,
    presetId: string,
    canManageOrgTemplates: boolean,
  ): Promise<void> {
    const row = await this.assertAccess(
      organizationId,
      userId,
      presetId,
      canManageOrgTemplates,
    );
    await this.presetRepository.remove(row);
  }

  private async assertAccess(
    organizationId: string,
    userId: string,
    presetId: string,
    canManageOrgTemplates: boolean,
  ): Promise<MailComposePresetEntity> {
    const row = await this.presetRepository.findOne({
      where: { id: presetId, organizationId },
    });
    if (!row) {
      throw new NotFoundException("Kayıt bulunamadı");
    }
    if (row.kind === "template" && !canManageOrgTemplates) {
      throw new ForbiddenException(
        "Şablon düzenlemek için posta yöneticisi yetkisi gerekir.",
      );
    }
    if (
      row.kind === "signature" &&
      row.ownerUserId !== null &&
      row.ownerUserId !== userId
    ) {
      throw new ForbiddenException("Bu imzaya erişim yok");
    }
    return row;
  }

  private async clearOtherDefaultSignatures(
    organizationId: string,
    userId: string,
    keepId: string,
  ): Promise<void> {
    const rows = await this.presetRepository.find({
      where: {
        organizationId,
        kind: "signature",
        ownerUserId: userId,
        isDefault: true,
      },
    });
    for (const row of rows) {
      if (row.id !== keepId) {
        row.isDefault = false;
        await this.presetRepository.save(row);
      }
    }
  }

  private async ensureStarterTemplates(organizationId: string): Promise<void> {
    const count = await this.presetRepository.count({
      where: { organizationId, kind: "template" },
    });
    if (count > 0) {
      return;
    }
    const starters: {
      name: string;
      subject: string;
      bodyText: string;
    }[] = [
      {
        name: "Yük teklifi",
        subject: "Nakliye teklifimiz",
        bodyText:
          "Merhaba,\n\nİlanınız için teklifimiz:\n• Rota: \n• Araç tipi: \n• Fiyat: \n• Yükleme tarihi: \n\nDetayları görüşmek için yanıtlayabilirsiniz.\n\nSaygılarımızla,",
      },
      {
        name: "Teklif kabul / onay",
        subject: "Teklif onayı",
        bodyText:
          "Merhaba,\n\nTeklifinizi kabul ediyoruz. Operasyon için iletişim bilgilerinizi ve yükleme saatini paylaşır mısınız?\n\nTeşekkürler,",
      },
      {
        name: "Evrak hatırlatma",
        subject: "Evrak / CMR hatırlatması",
        bodyText:
          "Merhaba,\n\nSevkiyat tamamlandıysa CMR ve fatura evraklarını bu e-postaya ek olarak gönderebilir misiniz?\n\nİyi çalışmalar,",
      },
      {
        name: "Gecikme bilgilendirme",
        subject: "Sevkiyat güncellemesi",
        bodyText:
          "Merhaba,\n\nSevkiyatınızla ilgili güncelleme:\n\nTahmini varış / gecikme nedeni: \n\nBilginize sunarız.",
      },
    ];
    for (const starter of starters) {
      await this.presetRepository.save(
        this.presetRepository.create({
          organizationId,
          ownerUserId: null,
          kind: "template",
          name: starter.name,
          subject: starter.subject,
          bodyText: starter.bodyText,
          isDefault: false,
        }),
      );
    }
  }

  private toDto(row: MailComposePresetEntity) {
    return {
      id: row.id,
      kind: row.kind,
      name: row.name,
      subject: row.subject,
      bodyText: row.bodyText,
      isDefault: row.isDefault,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
