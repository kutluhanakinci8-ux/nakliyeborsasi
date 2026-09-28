import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AuthorizationException,
  CompanyRoleCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import {
  DEFAULT_ORG_CHANNELS,
} from "./MessagingSlackDepthConstants";

@Injectable()
export class MessagingOrgChannelService {
  public constructor(
    @InjectRepository(MessageThreadEntity)
    private readonly messageThreadRepository: Repository<MessageThreadEntity>,
  ) {}

  public async ensureDefaultChannels(companyId: string): Promise<void> {
    for (const def of DEFAULT_ORG_CHANNELS) {
      const existing = await this.messageThreadRepository.findOne({
        where: {
          companyAId: companyId,
          companyBId: companyId,
          threadKind: "org_channel",
          channelSlug: def.slug,
        },
      });
      if (existing) {
        continue;
      }
      await this.messageThreadRepository.save(
        this.messageThreadRepository.create({
          companyAId: companyId,
          companyBId: companyId,
          freightListingId: null,
          threadKind: "org_channel",
          channelSlug: def.slug,
          channelName: def.name,
        }),
      );
    }
  }

  public async listChannels(
    companyId: string,
  ): Promise<
    {
      threadId: string;
      slug: string;
      name: string;
      createdAt: string;
    }[]
  > {
    await this.ensureDefaultChannels(companyId);
    const rows = await this.messageThreadRepository.find({
      where: {
        companyAId: companyId,
        companyBId: companyId,
        threadKind: "org_channel",
      },
      order: { channelName: "ASC" },
    });
    return rows.map((row) => ({
      threadId: row.id,
      slug: row.channelSlug ?? row.id,
      name: row.channelName ?? row.channelSlug ?? "Kanal",
      createdAt: row.createdAt.toISOString(),
    }));
  }

  public async createChannel(
    user: AuthenticatedUserContext,
    payload: { slug: string; name: string },
  ): Promise<MessageThreadEntity> {
    if (!user.roleCodes.includes(CompanyRoleCode.CompanyOwner)) {
      throw new AuthorizationException(
        "Kanal oluşturma için firma sahibi rolü gerekir",
      );
    }
    const slug = payload.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const name = payload.name.trim();
    if (slug.length < 2 || name.length < 2) {
      throw new ValidationException("Kanal adı ve slug gerekli (min 2 karakter)");
    }
    const existing = await this.messageThreadRepository.findOne({
      where: {
        companyAId: user.companyId,
        companyBId: user.companyId,
        threadKind: "org_channel",
        channelSlug: slug,
      },
    });
    if (existing) {
      return existing;
    }
    return this.messageThreadRepository.save(
      this.messageThreadRepository.create({
        companyAId: user.companyId,
        companyBId: user.companyId,
        freightListingId: null,
        threadKind: "org_channel",
        channelSlug: slug,
        channelName: name,
      }),
    );
  }

  public isOrgChannel(thread: MessageThreadEntity): boolean {
    return thread.threadKind === "org_channel";
  }
}
