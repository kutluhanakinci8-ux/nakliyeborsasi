import { Controller, Get, Header, Param, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { EmailEngagementService } from "./EmailEngagementService";

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

@Controller("email/track")
export class EmailTrackingController {
  public constructor(
    private readonly emailEngagementService: EmailEngagementService,
  ) {}

  @Get("open/:token")
  @Header("Content-Type", "image/gif")
  @Header("Cache-Control", "no-store, no-cache, must-revalidate, private")
  public async trackOpen(
    @Param("token") token: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    try {
      await this.emailEngagementService.recordOpen(token, request);
    } catch {
      // Always return pixel
    }
    response.status(200).send(TRANSPARENT_GIF);
  }

  @Get("click/:token")
  public async trackClick(
    @Param("token") token: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const target =
      await this.emailEngagementService.resolveClickRedirect(token, request);
    if (!target) {
      response.status(404).send("Link not found");
      return;
    }
    response.redirect(302, target);
  }
}
