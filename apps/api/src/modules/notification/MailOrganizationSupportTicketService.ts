import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import {
  MailOrganizationSupportTicketEntity,
  MailSupportTicketStatus,
  MailSupportTicketTopic,
} from "../../infrastructure/database/entities/MailOrganizationSupportTicketEntity";
import { MailOrganizationSupportTicketMessageEntity } from "../../infrastructure/database/entities/MailOrganizationSupportTicketMessageEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { MailSupportTicketNotificationService } from "./MailSupportTicketNotificationService";

export type MailSupportTicketSummaryDto = {
  id: string;
  publicRef: string;
  topic: MailSupportTicketTopic;
  subject: string;
  status: MailSupportTicketStatus;
  domainName: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type MailSupportTicketMessageDto = {
  id: string;
  authorKind: "customer" | "staff";
  body: string;
  createdAt: string;
};

export type MailSupportTicketDetailDto = MailSupportTicketSummaryDto & {
  messages: MailSupportTicketMessageDto[];
};

export type MailSupportTicketOperatorSummaryDto = MailSupportTicketSummaryDto & {
  organizationId: string;
  companyLegalName: string;
};

export type MailSupportTicketOperatorDetailDto = MailSupportTicketDetailDto & {
  organizationId: string;
  companyLegalName: string;
};

@Injectable()
export class MailOrganizationSupportTicketService {
  public constructor(
    @InjectRepository(MailOrganizationSupportTicketEntity)
    private readonly ticketRepository: Repository<MailOrganizationSupportTicketEntity>,
    @InjectRepository(MailOrganizationSupportTicketMessageEntity)
    private readonly messageRepository: Repository<MailOrganizationSupportTicketMessageEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    private readonly mailSupportTicketNotificationService: MailSupportTicketNotificationService,
  ) {}

  public async listForOrganization(
    organizationId: string,
  ): Promise<MailSupportTicketSummaryDto[]> {
    const tickets = await this.ticketRepository.find({
      where: { organizationId },
      order: { updatedAt: "DESC" },
      take: 100,
    });
    const counts = await Promise.all(
      tickets.map(async (t) =>
        this.messageRepository.count({ where: { ticketId: t.id } }),
      ),
    );
    return tickets.map((t, i) => this.toSummary(t, counts[i] ?? 0));
  }

  public async create(params: {
    organizationId: string;
    userId: string;
    topic: MailSupportTicketTopic;
    subject: string;
    message: string;
    domain?: string;
  }): Promise<MailSupportTicketDetailDto> {
    const subject = params.subject.trim();
    const message = params.message.trim();
    if (!subject || !message) {
      throw new BadRequestException("Konu ve mesaj zorunludur.");
    }
    const ticket = this.ticketRepository.create({
      organizationId: params.organizationId,
      createdByUserId: params.userId,
      topic: params.topic,
      subject,
      status: "open",
      domainName: params.domain?.trim().toLowerCase() || null,
    });
    const saved = await this.ticketRepository.save(ticket);
    await this.messageRepository.save(
      this.messageRepository.create({
        ticketId: saved.id,
        authorUserId: params.userId,
        authorKind: "customer",
        body: message,
      }),
    );
    const detail = await this.getForOrganization(params.organizationId, saved.id);
    const publicRef =
      saved.id.split("-")[0]?.toUpperCase() ?? saved.id.slice(0, 8);
    void this.mailSupportTicketNotificationService.notifySupportDeskNewTicket({
      ticketId: saved.id,
      publicRef,
      organizationId: params.organizationId,
      createdByUserId: params.userId,
      topic: params.topic,
      subject,
      messagePreview: message,
    });
    return detail;
  }

  public async getForOrganization(
    organizationId: string,
    ticketId: string,
  ): Promise<MailSupportTicketDetailDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, organizationId },
    });
    if (!ticket) {
      throw new NotFoundException("Destek talebi bulunamadı.");
    }
    const messages = await this.messageRepository.find({
      where: { ticketId: ticket.id },
      order: { createdAt: "ASC" },
    });
    const count = messages.length;
    return {
      ...this.toSummary(ticket, count),
      messages: messages.map((m) => ({
        id: m.id,
        authorKind: m.authorKind,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  public async addCustomerMessage(params: {
    organizationId: string;
    userId: string;
    ticketId: string;
    message: string;
  }): Promise<MailSupportTicketDetailDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: params.ticketId, organizationId: params.organizationId },
    });
    if (!ticket) {
      throw new NotFoundException("Destek talebi bulunamadı.");
    }
    if (ticket.status === "resolved") {
      throw new BadRequestException("Kapatılmış talebe yanıt eklenemez.");
    }
    const body = params.message.trim();
    if (!body) {
      throw new BadRequestException("Mesaj boş olamaz.");
    }
    await this.messageRepository.save(
      this.messageRepository.create({
        ticketId: ticket.id,
        authorUserId: params.userId,
        authorKind: "customer",
        body,
      }),
    );
    ticket.status = "open";
    ticket.updatedAt = new Date();
    await this.ticketRepository.save(ticket);
    return this.getForOrganization(params.organizationId, ticket.id);
  }

  public async listForOperator(filters?: {
    topic?: MailSupportTicketTopic;
    companyQuery?: string;
  }): Promise<MailSupportTicketOperatorSummaryDto[]> {
    const qb = this.ticketRepository
      .createQueryBuilder("ticket")
      .orderBy("ticket.updatedAt", "DESC")
      .take(200);

    if (filters?.topic) {
      qb.andWhere("ticket.topic = :topic", { topic: filters.topic });
    }

    const companyQuery = filters?.companyQuery?.trim();
    if (companyQuery) {
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(companyQuery)) {
        qb.andWhere("ticket.organization_id = :organizationId", {
          organizationId: companyQuery,
        });
      } else {
        qb.innerJoin(
          CompanyEntity,
          "company",
          "company.id = ticket.organization_id",
        ).andWhere("LOWER(company.legalName) LIKE :companyName", {
          companyName: `%${companyQuery.toLowerCase()}%`,
        });
      }
    }

    const tickets = await qb.getMany();
    if (tickets.length === 0) {
      return [];
    }
    const orgIds = [...new Set(tickets.map((t) => t.organizationId))];
    const companies = await this.companyRepository.find({
      where: { id: In(orgIds) },
    });
    const companyById = new Map(companies.map((c) => [c.id, c.legalName]));
    const counts = await Promise.all(
      tickets.map(async (t) =>
        this.messageRepository.count({ where: { ticketId: t.id } }),
      ),
    );
    return tickets.map((t, i) => ({
      ...this.toSummary(t, counts[i] ?? 0),
      organizationId: t.organizationId,
      companyLegalName: companyById.get(t.organizationId) ?? t.organizationId,
    }));
  }

  public async getForOperator(
    ticketId: string,
  ): Promise<MailSupportTicketOperatorDetailDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException("Destek talebi bulunamadı.");
    }
    const company = await this.companyRepository.findOne({
      where: { id: ticket.organizationId },
    });
    const messages = await this.messageRepository.find({
      where: { ticketId: ticket.id },
      order: { createdAt: "ASC" },
    });
    const count = messages.length;
    return {
      ...this.toSummary(ticket, count),
      organizationId: ticket.organizationId,
      companyLegalName: company?.legalName ?? ticket.organizationId,
      messages: messages.map((m) => ({
        id: m.id,
        authorKind: m.authorKind,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  public async addStaffMessage(params: {
    ticketId: string;
    staffUserId: string;
    message: string;
  }): Promise<MailSupportTicketOperatorDetailDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: params.ticketId },
    });
    if (!ticket) {
      throw new NotFoundException("Destek talebi bulunamadı.");
    }
    if (ticket.status === "resolved") {
      throw new BadRequestException("Kapatılmış talebe yanıt eklenemez.");
    }
    const body = params.message.trim();
    if (!body) {
      throw new BadRequestException("Mesaj boş olamaz.");
    }
    const savedMessage = await this.messageRepository.save(
      this.messageRepository.create({
        ticketId: ticket.id,
        authorUserId: params.staffUserId,
        authorKind: "staff",
        body,
      }),
    );
    ticket.status = "waiting_customer";
    ticket.updatedAt = new Date();
    await this.ticketRepository.save(ticket);
    const publicRef =
      ticket.id.split("-")[0]?.toUpperCase() ?? ticket.id.slice(0, 8);
    void this.mailSupportTicketNotificationService.notifyCustomerStaffReply({
      ticketId: ticket.id,
      messageId: savedMessage.id,
      publicRef,
      organizationId: ticket.organizationId,
      createdByUserId: ticket.createdByUserId,
      ticketSubject: ticket.subject,
      staffMessagePreview: body,
    });
    return this.getForOperator(ticket.id);
  }

  public async updateStatusForOperator(params: {
    ticketId: string;
    status: MailSupportTicketStatus;
  }): Promise<MailSupportTicketOperatorDetailDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: params.ticketId },
    });
    if (!ticket) {
      throw new NotFoundException("Destek talebi bulunamadı.");
    }
    ticket.status = params.status;
    ticket.updatedAt = new Date();
    await this.ticketRepository.save(ticket);
    return this.getForOperator(ticket.id);
  }

  private toSummary(
    ticket: MailOrganizationSupportTicketEntity,
    messageCount: number,
  ): MailSupportTicketSummaryDto {
    return {
      id: ticket.id,
      publicRef: ticket.id.split("-")[0]?.toUpperCase() ?? ticket.id.slice(0, 8),
      topic: ticket.topic,
      subject: ticket.subject,
      status: ticket.status,
      domainName: ticket.domainName,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      messageCount,
    };
  }
}
