import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import { SocialPostStatusCode } from "@nakliyeborsasi/core";
import { CompanySocialPostEntity } from "../../infrastructure/database/entities/CompanySocialPostEntity";
import { SocialHubApplicationService } from "./SocialHubApplicationService";

@Injectable()
export class SocialPostPublishScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialPostPublishScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    @InjectRepository(CompanySocialPostEntity)
    private readonly postRepository: Repository<CompanySocialPostEntity>,
    private readonly socialHubApplicationService: SocialHubApplicationService,
  ) {}

  public onModuleInit(): void {
    const enabled = process.env.SOCIAL_POST_PUBLISH_JOB_ENABLED !== "0";
    if (!enabled) {
      return;
    }
    const intervalMs = Number.parseInt(
      process.env.SOCIAL_POST_PUBLISH_JOB_INTERVAL_MS ?? `${60 * 1000}`,
      10,
    );
    this.timer = setInterval(() => {
      void this.runDuePosts().catch((error) => {
        this.logger.warn(
          `Scheduled publish sweep failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }, intervalMs);
    void this.runDuePosts();
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async runDuePosts(): Promise<void> {
    const now = new Date();
    const due = await this.postRepository.find({
      where: {
        statusCode: SocialPostStatusCode.Scheduled,
        scheduledAt: LessThanOrEqual(now),
      },
      take: 20,
      order: { scheduledAt: "ASC" },
    });
    for (const post of due) {
      try {
        await this.socialHubApplicationService.publishPostScheduled(post);
        this.logger.log(
          `Published scheduled post id=${post.id} company=${post.companyId}`,
        );
      } catch (error) {
        this.logger.warn(
          `Scheduled publish failed post=${post.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
