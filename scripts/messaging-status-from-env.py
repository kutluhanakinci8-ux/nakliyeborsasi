#!/usr/bin/env python3
"""FS verify: MESSAGING_STATUS_JSON ortam değişkeninden JSON okur."""
import json
import os
import sys

def load():
    raw = os.environ.get("MESSAGING_STATUS_JSON", "")
    if not raw:
        raise SystemExit("FAIL: MESSAGING_STATUS_JSON boş")
    return json.loads(raw)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("usage: messaging-status-from-env.py <check>")
    check = sys.argv[1]
    data = load()
    features = set(data.get("features") or [])

    if check == "fs1":
        required = {"sse_stream", "attachments", "web_push"}
        missing = required - features
        if missing:
            raise SystemExit(f"FAIL: eksik features: {sorted(missing)}")
        atts = data.get("attachments") or {}
        if atts.get("maxBytesPerFile") != 10_000_000:
            raise SystemExit(f"FAIL: maxBytesPerFile beklenen 10000000, gelen {atts.get('maxBytesPerFile')}")
        xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        allowed = atts.get("allowedContentTypes") or []
        if xlsx not in allowed:
            raise SystemExit("FAIL: XLSX content-type listede yok")
        if "sse" not in data:
            raise SystemExit("FAIL: sse stats yok")
        print("OK: status features + attachments + sse")
    elif check == "fs2":
        required = {
            "server_search",
            "markdown_messages",
            "quick_replies",
            "thread_insights",
            "thread_llm_summary",
        }
        missing = required - features
        if missing:
            raise SystemExit(f"FAIL: eksik features: {sorted(missing)}")
        print("OK: FS-2 status features")
    elif check == "fs8":
        required = {"company_search", "hub_default_tab"}
        missing = required - features
        if missing:
            raise SystemExit(f"FAIL: eksik features: {sorted(missing)}")
        print("OK: FS-8 status features (company_search, hub_default_tab)")
    elif check == "fs10":
        required = {
            "attachment_drag_drop",
            "message_day_avatars",
            "search_scroll_to_message",
            "context_pin_strip",
            "mobile_thread_layout",
            "quote_reply",
        }
        missing = required - features
        if missing:
            raise SystemExit(f"FAIL: eksik features: {sorted(missing)}")
        print("OK: FS-10 status features")
    elif check == "fs9":
        required = {
            "read_receipt_panel",
            "group_thread_ui",
            "message_edit_modal",
            "mention_highlight",
            "internal_note_filter",
        }
        missing = required - features
        if missing:
            raise SystemExit(f"FAIL: eksik features: {sorted(missing)}")
        print("OK: FS-9 status features")
    elif check == "fs11":
        required = {
            "message_operation_stamp",
            "quick_reply_org_crud",
            "compose_keyboard_shortcuts",
            "notification_matrix_messaging",
            "ediscovery_zip_prod_ready",
        }
        missing = required - features
        if missing:
            raise SystemExit(f"FAIL: eksik features: {sorted(missing)}")
        print("OK: FS-11 status features")
    elif check == "fs12":
        required = {
            "whatsapp_notify_bridge",
            "whatsapp_notify_bridge_kvkk",
            "webhook_message_stamped",
            "group_participant_roles",
            "partner_api_messaging_stamp",
            "native_shell_capacitor_ready",
        }
        missing = required - features
        if missing:
            raise SystemExit(f"FAIL: eksik features: {sorted(missing)}")
        print("OK: FS-12 status features")
    else:
        raise SystemExit(f"unknown check {check}")
