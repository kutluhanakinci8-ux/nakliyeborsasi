import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { MailComposePresetService } from "./MailComposePresetService";
import { MailOrganizationBrandingService } from "./MailOrganizationBrandingService";
import {
  buildOutboundSignatureHtml,
  signatureAlreadyInPlainBody,
} from "./MailComposeSignatureHtml";
import {
  OutboundWrapBranding,
  plainTextToOutboundBodyHtml,
  resolveOutboundHtml,
} from "./MailOutboundHtmlTemplate";

@Injectable()
export class MailMailboxOutboundContentService {
  public constructor(
    private readonly mailOrganizationBrandingService: MailOrganizationBrandingService,
    private readonly mailComposePresetService: MailComposePresetService,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
  ) {}

  public async prepare(params: {
    organizationId: string;
    userId?: string;
    text: string;
    html?: string;
    fromHeader: string;
  }): Promise<{ text: string; html: string; branding: OutboundWrapBranding }> {
    const company = await this.companyRepository.findOne({
      where: { id: params.organizationId },
    });
    const companyName = company?.legalName?.trim() || "Kurumsal hesap";
    const branding =
      await this.mailOrganizationBrandingService.resolveOutboundWrapBranding(
        params.organizationId,
        companyName,
      );

    let text = params.text;
    let htmlInner = params.html?.trim() || undefined;

    if (params.userId) {
      const signature =
        await this.mailComposePresetService.resolveDefaultSignatureForOutbound(
          params.organizationId,
          params.userId,
        );
      if (
        signature &&
        !signatureAlreadyInPlainBody(text, signature.bodyText)
      ) {
        text = `${text.replace(/\s+$/, "")}\n\n${signature.bodyText.trim()}`;
        const sigHtml = buildOutboundSignatureHtml(signature);
        htmlInner = htmlInner
          ? `${htmlInner}\n${sigHtml}`
          : `${plainTextToOutboundBodyHtml(params.text)}\n${sigHtml}`;
      }
    }

    const html = resolveOutboundHtml(text, htmlInner, {
      fromHeader: params.fromHeader,
      branding,
    });
    return { text, html, branding };
  }
}
