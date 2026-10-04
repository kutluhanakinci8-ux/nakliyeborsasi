import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { LessThan, Repository } from "typeorm";
import { ResourceNotFoundException, ValidationException } from "@nakliyeborsasi/core";
import { CompanySocialOAuthStateEntity } from "../../../infrastructure/database/entities/CompanySocialOAuthStateEntity";

const STATE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class SocialHubOAuthStateService {
  public constructor(
    @InjectRepository(CompanySocialOAuthStateEntity)
    private readonly stateRepository: Repository<CompanySocialOAuthStateEntity>,
  ) {}

  public async issueState(
    companyId: string,
    platformCode: string,
    options?: { pkceVerifier?: string },
  ): Promise<string> {
    await this.stateRepository.delete({
      companyId,
      platformCode,
    });
    const stateToken = randomBytes(24).toString("base64url");
    await this.stateRepository.save(
      this.stateRepository.create({
        stateToken,
        companyId,
        platformCode,
        pkceVerifier: options?.pkceVerifier ?? null,
        expiresAt: new Date(Date.now() + STATE_TTL_MS),
      }),
    );
    return stateToken;
  }

  public async consumeState(stateToken: string): Promise<CompanySocialOAuthStateEntity> {
    const row = await this.stateRepository.findOne({
      where: { stateToken },
    });
    if (!row) {
      throw new ResourceNotFoundException("SocialOAuthState", stateToken);
    }
    if (row.expiresAt.getTime() < Date.now()) {
      await this.stateRepository.delete({ id: row.id });
      throw new ValidationException("OAuth oturumu süresi doldu.");
    }
    await this.stateRepository.delete({ id: row.id });
    return row;
  }

  public async purgeExpired(): Promise<void> {
    await this.stateRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
