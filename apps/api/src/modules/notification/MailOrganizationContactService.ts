import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailOrgContactEntity } from "../../infrastructure/database/entities/MailOrgContactEntity";
import { MailContactCardDavService } from "./MailContactCardDavService";
import { parseVcfContacts } from "./MailVcfUtil";

const MAX_CONTACTS = 1000;

export type MailOrgContactDto = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class MailOrganizationContactService {
  public constructor(
    @InjectRepository(MailOrgContactEntity)
    private readonly contactRepository: Repository<MailOrgContactEntity>,
    private readonly mailContactCardDavService: MailContactCardDavService,
  ) {}

  public async list(organizationId: string): Promise<MailOrgContactDto[]> {
    const rows = await this.contactRepository.find({
      where: { organizationId },
      order: { displayName: "ASC" },
    });
    return rows.map((row) => this.toDto(row));
  }

  public async create(
    organizationId: string,
    input: {
      displayName: string;
      email?: string | null;
      phone?: string | null;
      notes?: string | null;
    },
  ): Promise<MailOrgContactDto> {
    this.validateContactInput(input);
    const count = await this.contactRepository.count({
      where: { organizationId },
    });
    if (count >= MAX_CONTACTS) {
      throw new BadRequestException(`En fazla ${MAX_CONTACTS} kişi.`);
    }
    const row = await this.contactRepository.save(
      this.contactRepository.create({
        organizationId,
        displayName: input.displayName.trim(),
        email: input.email?.trim().toLowerCase() || null,
        phone: input.phone?.trim() || null,
        notes: input.notes?.trim() || null,
      }),
    );
    return this.toDto(row);
  }

  public async update(
    organizationId: string,
    contactId: string,
    input: {
      displayName?: string;
      email?: string | null;
      phone?: string | null;
      notes?: string | null;
    },
  ): Promise<MailOrgContactDto> {
    const row = await this.assertContact(organizationId, contactId);
    if (input.displayName !== undefined) {
      row.displayName = input.displayName.trim();
    }
    if (input.email !== undefined) {
      row.email = input.email?.trim().toLowerCase() || null;
    }
    if (input.phone !== undefined) {
      row.phone = input.phone?.trim() || null;
    }
    if (input.notes !== undefined) {
      row.notes = input.notes?.trim() || null;
    }
    this.validateContactInput({
      displayName: row.displayName,
      email: row.email,
    });
    await this.contactRepository.save(row);
    return this.toDto(row);
  }

  public async delete(organizationId: string, contactId: string): Promise<void> {
    const row = await this.assertContact(organizationId, contactId);
    await this.mailContactCardDavService.deleteRemoteForContact(row);
    await this.contactRepository.remove(row);
  }

  public async importVcf(
    organizationId: string,
    vcfText: string,
  ): Promise<{ imported: number; skipped: number }> {
    const trimmed = vcfText.trim();
    if (trimmed.length < 10) {
      throw new BadRequestException("Geçersiz vCard içeriği.");
    }
    if (trimmed.length > 500_000) {
      throw new BadRequestException("vCard dosyası çok büyük.");
    }
    const parsed = parseVcfContacts(trimmed);
    if (parsed.length === 0) {
      throw new BadRequestException("vCard içinde kişi bulunamadı.");
    }
    const count = await this.contactRepository.count({
      where: { organizationId },
    });
    let imported = 0;
    let skipped = 0;
    for (const row of parsed) {
      if (count + imported >= MAX_CONTACTS) {
        skipped += parsed.length - imported - skipped;
        break;
      }
      try {
        this.validateContactInput({
          displayName: row.displayName,
          email: row.email,
        });
      } catch {
        skipped += 1;
        continue;
      }
      await this.contactRepository.save(
        this.contactRepository.create({
          organizationId,
          displayName: row.displayName.trim(),
          email: row.email,
          phone: row.phone,
          notes: row.notes,
        }),
      );
      imported += 1;
    }
    return { imported, skipped };
  }

  public async exportVcf(organizationId: string): Promise<string> {
    const rows = await this.contactRepository.find({
      where: { organizationId },
      order: { displayName: "ASC" },
    });
    const cards = rows.map((row) => {
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${escapeVcf(row.displayName)}`,
      ];
      if (row.email) {
        lines.push(`EMAIL:${row.email}`);
      }
      if (row.phone) {
        lines.push(`TEL:${row.phone}`);
      }
      if (row.notes) {
        lines.push(`NOTE:${escapeVcf(row.notes)}`);
      }
      lines.push("END:VCARD");
      return lines.join("\r\n");
    });
    return `${cards.join("\r\n")}\r\n`;
  }

  private async assertContact(
    organizationId: string,
    contactId: string,
  ): Promise<MailOrgContactEntity> {
    const row = await this.contactRepository.findOne({
      where: { id: contactId, organizationId },
    });
    if (!row) {
      throw new NotFoundException("Kişi bulunamadı.");
    }
    return row;
  }

  private validateContactInput(input: {
    displayName: string;
    email?: string | null;
  }): void {
    if (!input.displayName?.trim()) {
      throw new BadRequestException("Ad gerekli.");
    }
    if (input.email && !input.email.includes("@")) {
      throw new BadRequestException("Geçersiz e-posta.");
    }
  }

  private toDto(row: MailOrgContactEntity): MailOrgContactDto {
    return {
      id: row.id,
      displayName: row.displayName,
      email: row.email,
      phone: row.phone,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function escapeVcf(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}
