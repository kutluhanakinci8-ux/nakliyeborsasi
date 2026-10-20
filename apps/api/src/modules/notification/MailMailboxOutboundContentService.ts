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
import { MailMarketingUnsubscribeService } from "./MailMarketingUnsubscribeService";

export type OutboundContentChannel = "transactional" | "marketing";

@Injectable()
export class MailMailboxOutboundContentService {
  public constructor(
    private readonly mailOrganizationBrandingService: MailOrganizationBrandingService,
    private readonly mailComposePresetService: MailComposePresetService,
    private readonly mailMarketingUnsubscribeService: MailMarketingUnsubscribeService,
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
    channel?: OutboundContentChannel;
  }): Promise<{
    text: string;
    html: string;
    branding: OutboundWrapBranding;
    listUnsubscribeUrl?: string;
  }> {
    const company = await this.companyRepository.findOne({
      where: { id: params.organizationId },
    });
    const companyName = company?.legalName?.trim() || "Kurumsal hesap";
    let branding =
      await this.mailOrganizationBrandingService.resolveOutboundWrapBranding(
        params.organizationId,
        companyName,
      );
    let listUnsubscribeUrl: string | undefined;
    if (params.channel === "marketing" && params.toEmail?.trim()) {
      listUnsubscribeUrl = this.mailMarketingUnsubscribeService.buildUnsubscribeUrl(
        params.organizationId,
        params.toEmail.trim(),
      );
      branding = {
        ...branding,
        marketingUnsubscribeUrl: listUnsubscribeUrl,
      };
    }

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
    return {
      text,
      html,
      branding,
      listUnsubscribeUrl,
    };
  }
}
