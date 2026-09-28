import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "crypto";

type TicketRecord = {
  companyId: string;
  userId: string;
  expiresAtMs: number;
};

@Injectable()
export class MessagingStreamTicketService {
  private readonly tickets = new Map<string, TicketRecord>();
  private static readonly ttlMs = 120_000;

  public issue(companyId: string, userId: string): string {
    const ticket = randomUUID();
    this.tickets.set(ticket, {
      companyId,
      userId,
      expiresAtMs: Date.now() + MessagingStreamTicketService.ttlMs,
    });
    return ticket;
  }

  public consume(ticket: string): { companyId: string; userId: string } {
    const raw = ticket?.trim();
    if (!raw) {
      throw new UnauthorizedException("Geçersiz akış bileti.");
    }
    const record = this.tickets.get(raw);
    this.tickets.delete(raw);
    if (!record || record.expiresAtMs < Date.now()) {
      throw new UnauthorizedException("Akış bileti süresi doldu.");
    }
    return { companyId: record.companyId, userId: record.userId };
  }
}
