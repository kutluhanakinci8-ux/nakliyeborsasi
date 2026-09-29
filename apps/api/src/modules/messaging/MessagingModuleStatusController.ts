import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { resolveMessagingVapidFromEnv } from "../../infrastructure/push/messagingVapidEnv";
import { MessagingAttachmentStorageService } from "./MessagingAttachmentStorageService";
import { MessagingRealtimeHubService } from "./MessagingRealtimeHubService";
import { MessagingOptionalWsService } from "./MessagingOptionalWsService";

@Controller("messaging")
export class MessagingModuleStatusController {
  public constructor(
    private readonly configService: ConfigService,
    private readonly messagingRealtimeHubService: MessagingRealtimeHubService,
    private readonly messagingOptionalWsService: MessagingOptionalWsService,
  ) {}

  @Get("status")
  public getStatus(): {
    module: string;
    phase: string;
    features: string[];
    translate: { deepl: boolean; libretranslate: boolean };
    attachments: {
      maxCount: number;
      maxBytesPerFile: number;
      allowedContentTypes: string[];
    };
    webPush: { enabled: boolean; isolatedVapid: boolean };
    sse: ReturnType<MessagingRealtimeHubService["getStats"]>;
    ws: { enabled: boolean; port: number | null };
  } {
    const deepl = Boolean(
      this.configService.get<string>("MESSAGING_DEEPL_API_KEY")?.trim(),
    );
    const libre = Boolean(
      this.configService.get<string>("MESSAGING_TRANSLATE_API_URL")?.trim(),
    );
    const vapid = resolveMessagingVapidFromEnv();
    return {
      module: "messaging",
      phase: "ga",
      features: [
        "company_threads",
        "freight_listing_threads",
        "email_notifications",
        "deep_links",
        "read_receipts",
        "structured_summary",
        "translate_api",
        "company_export",
        "platform_ediscovery",
        "sse_stream",
        "attachments",
        "web_push",
        "server_search",
        "markdown_messages",
        "quick_replies",
        "thread_insights",
        "thread_llm_summary",
        "user_read_receipts",
        "typing_indicator",
        "internal_notes",
        "message_edit_delete",
        "user_mentions",
        "sse_redis_fanout",
        "thread_legal_hold",
        "messaging_crud_audit",
        "ediscovery_zip_sha256",
        "company_message_rate_limit",
        "outbound_webhooks",
        "public_api_messaging_read",
        "retention_policy_job",
        "chat_accept_fixed_price",
        "notify_push_messaging_chat",
        "slack_incoming_bridge",
        "automation_catalog_zapier_make",
        "messaging_bot_tokens",
        "public_api_messaging_write",
        "optional_ws_gateway",
        "group_threads_pilot",
        "whatsapp_notify_bridge",
        "company_search",
        "hub_default_tab",
        "read_receipt_panel",
        "group_thread_ui",
        "message_edit_modal",
        "mention_highlight",
        "internal_note_filter",
        "attachment_drag_drop",
        "message_day_avatars",
        "search_scroll_to_message",
        "context_pin_strip",
        "mobile_thread_layout",
        "quote_reply",
        "message_operation_stamp",
        "quick_reply_org_crud",
        "compose_keyboard_shortcuts",
        "notification_matrix_messaging",
        "ediscovery_zip_prod_ready",
        "native_shell_capacitor_docs",
      ],
      translate: { deepl, libretranslate: libre },
      attachments: {
        maxCount: MessagingAttachmentStorageService.maxAttachmentsPublic(),
        maxBytesPerFile: MessagingAttachmentStorageService.maxBytesPublic(),
        allowedContentTypes:
          MessagingAttachmentStorageService.allowedContentTypesPublic(),
      },
      webPush: {
        enabled: vapid !== null,
        isolatedVapid: vapid?.isolated ?? false,
      },
      sse: this.messagingRealtimeHubService.getStats(),
      ws: {
        enabled: this.messagingOptionalWsService.isEnabled(),
        port: this.messagingOptionalWsService.getPort(),
      },
    };
  }
}
