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
  applyOutboundMergeFields,
  parseSenderFromHeader,
  type OutboundMergeContext,
} from "./MailOutboundMergeFields";
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
    toEmail?: string;
    mergeContext?: Pick<OutboundMergeContext, "referans" | "musteriAdi">;
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

    const sender = parseSenderFromHeader(params.fromHeader);
    const merged = applyOutboundMergeFields(
      params.text,
      params.html?.trim() || undefined,
      {
        firmaAdi: companyName,
        gonderenAd: sender.gonderenAd,
        gonderenEposta: sender.gonderenEposta,
        aliciEposta: params.toEmail?.trim().toLowerCase() || null,
        referans: params.mergeContext?.referans ?? null,
        musteriAdi: params.mergeContext?.musteriAdi ?? null,
      },
    );
    let text = merged.text;
    let htmlInner = merged.html;

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
          : `${plainTextToOutboundBodyHtml(text)}\n${sigHtml}`;
      }
    }

    const html = resolveOutboundHtml(text, htmlInner, {
      fromHeader: params.fromHeader,
      branding,
    });
    return { text, html, branding };
  }
}
