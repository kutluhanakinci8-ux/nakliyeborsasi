import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  SocialConnectionStatusCode,
  SocialPlatformCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { decryptTotpSecret } from "../../auth/TotpSecretCipher";
import { CompanySocialConnectionEntity } from "../../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubOAuthConfigService } from "./SocialHubOAuthConfigService";
import { parseSocialHubConnectionMetadata } from "./SocialHubConnectionMetadata";

@Injectable()
export class SocialHubTokenVaultService {
  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly oauthConfig: SocialHubOAuthConfigService,
  ) {}

  public async getAccessToken(
    companyId: string,
    platformCode: SocialPlatformCode | string,
  ): Promise<string | null> {
    const row = await this.connectionRepository.findOne({
      where: {
        companyId,
        platformCode: String(platformCode),
        statusCode: SocialConnectionStatusCode.Connected,
      },
    });
    if (!row?.accessTokenCiphertext) {
      return null;
    }
    const key = this.oauthConfig.getOAuthEncryptionKey();
    if (!key) {
      return null;
    }
    try {
      return decryptTotpSecret(row.accessTokenCiphertext, key);
    } catch {
      return null;
    }
  }

  public async requireAccessToken(
    companyId: string,
    platformCode: SocialPlatformCode | string,
  ): Promise<string> {
    const token = await this.getAccessToken(companyId, platformCode);
    if (!token) {
      throw new ValidationException(
        "Kanal erişim tokenı yok; önce OAuth bağlantısı yapın.",
      );
    }
    return token;
  }

  public async findConnectedByExternalAccount(
    platformCode: SocialPlatformCode,
    externalAccountId: string,
  ): Promise<CompanySocialConnectionEntity | null> {
    const trimmed = externalAccountId.trim();
    const direct = await this.connectionRepository.findOne({
      where: {
        platformCode,
        externalAccountId: trimmed,
        statusCode: SocialConnectionStatusCode.Connected,
      },
    });
    if (direct) {
      return direct;
    }
    if (platformCode !== SocialPlatformCode.Instagram) {
      return null;
    }
    const knownIgId =
      this.oauthConfig.getKnownInstagramBusinessAccountId()?.trim() ?? null;
    const rows = await this.connectionRepository.find({
      where: {
        platformCode,
        statusCode: SocialConnectionStatusCode.Connected,
      },
    });
    for (const row of rows) {
      const metadata = parseSocialHubConnectionMetadata(row.grantedScopes);
      if (
        metadata.instagramBusinessAccountId === trimmed ||
        metadata.instagramLoginUserId === trimmed ||
        metadata.pageId === trimmed ||
        (knownIgId &&
          (row.externalAccountId === knownIgId ||
            metadata.instagramBusinessAccountId === knownIgId) &&
          trimmed === knownIgId)
      ) {
        return row;
      }
    }
    return null;
  }
}
