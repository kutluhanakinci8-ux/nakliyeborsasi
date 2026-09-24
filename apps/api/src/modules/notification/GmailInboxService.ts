import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { google } from "googleapis";
import { Repository } from "typeorm";
import { PlatformGmailCredentialEntity } from "../../infrastructure/database/entities/PlatformGmailCredentialEntity";
import { GmailOAuthConfigurationService } from "./GmailOAuthConfigurationService";

export type GmailInboxMessageSummary = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  receivedAt: string | null;
  labelIds: string[];
  gmailWebUrl: string;
};

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

@Injectable()
export class GmailInboxService {
  private readonly logger = new Logger(GmailInboxService.name);

  public constructor(
    @InjectRepository(PlatformGmailCredentialEntity)
    private readonly credentialRepository: Repository<PlatformGmailCredentialEntity>,
    private readonly gmailOAuthConfigurationService: GmailOAuthConfigurationService,
  ) {}

  public getRequiredScopes(): string[] {
    return GMAIL_SCOPES;
  }

  public async getConnectionStatus(): Promise<{
    configured: boolean;
    connected: boolean;
    emailAddress: string | null;
    connectedAt: string | null;
  }> {
    const row = await this.resolveCredential();
    return {
      configured: this.gmailOAuthConfigurationService.isConfigured(),
      connected: Boolean(row?.refreshToken),
      emailAddress: row?.emailAddress ?? null,
      connectedAt: row?.connectedAt?.toISOString() ?? null,
    };
  }

  public createOAuthClient() {
    const clientId = this.gmailOAuthConfigurationService.getClientId();
    const clientSecret = this.gmailOAuthConfigurationService.getClientSecret();
    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth is not configured");
    }
    return new google.auth.OAuth2(
      clientId,
      clientSecret,
      this.gmailOAuthConfigurationService.resolveRedirectUri(),
    );
  }

  public async saveTokensFromOAuthCode(
    code: string,
  ): Promise<PlatformGmailCredentialEntity> {
    const oauth2 = this.createOAuthClient();
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error(
        "Google refresh token missing — revoke app access and reconnect with prompt=consent",
      );
    }
    oauth2.setCredentials(tokens);
    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
    const profile = await oauth2Api.userinfo.get();
    const email = profile.data.email ?? "unknown@gmail.com";
    const existing = await this.credentialRepository.findOne({
      where: { id: "default" },
    });
    const row =
      existing ??
      this.credentialRepository.create({
        id: "default",
        emailAddress: email,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope ?? GMAIL_SCOPES.join(" "),
      });
    row.emailAddress = email;
    row.refreshToken = tokens.refresh_token;
    row.scope = tokens.scope ?? row.scope;
    return this.credentialRepository.save(row);
  }

  public async disconnect(): Promise<void> {
    await this.credentialRepository.delete({ id: "default" });
  }

  public async listInboxMessages(
    maxResults = 40,
  ): Promise<GmailInboxMessageSummary[]> {
    const credential = await this.resolveCredential();
    if (!credential?.refreshToken) {
      return [];
    }
    const oauth2 = this.createOAuthClient();
    oauth2.setCredentials({ refresh_token: credential.refreshToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2 });
    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      labelIds: ["INBOX"],
    });
    const ids = list.data.messages ?? [];
    const summaries: GmailInboxMessageSummary[] = [];
    for (const entry of ids) {
      if (!entry.id) {
        continue;
      }
      try {
        const full = await gmail.users.messages.get({
          userId: "me",
          id: entry.id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });
        const headers = full.data.payload?.headers ?? [];
        const subject =
          headers.find((h) => h.name === "Subject")?.value ?? "(konu yok)";
        const from = headers.find((h) => h.name === "From")?.value ?? "—";
        const dateHeader = headers.find((h) => h.name === "Date")?.value;
        summaries.push({
          id: entry.id,
          threadId: full.data.threadId ?? entry.id,
          subject,
          from,
          snippet: full.data.snippet ?? "",
          receivedAt: dateHeader ?? null,
          labelIds: full.data.labelIds ?? [],
          gmailWebUrl: `https://mail.google.com/mail/u/0/#inbox/${full.data.threadId ?? entry.id}`,
        });
      } catch (error) {
        this.logger.warn(`Gmail message ${entry.id} skipped`, error);
      }
    }
    return summaries;
  }

  private async resolveCredential(): Promise<PlatformGmailCredentialEntity | null> {
    const fromDb = await this.credentialRepository.findOne({
      where: { id: "default" },
    });
    if (fromDb) {
      return fromDb;
    }
    const bootstrap =
      this.gmailOAuthConfigurationService.getBootstrapRefreshToken();
    if (!bootstrap?.trim()) {
      return null;
    }
    return this.credentialRepository.save(
      this.credentialRepository.create({
        id: "default",
        emailAddress: "lertalogistics@gmail.com",
        refreshToken: bootstrap.trim(),
        scope: GMAIL_SCOPES.join(" "),
      }),
    );
  }
}
