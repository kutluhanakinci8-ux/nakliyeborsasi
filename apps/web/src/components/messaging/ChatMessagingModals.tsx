"use client";

import type {
  MessagingCompanySearchRecord,
  MessagingOrgQuickReplyRecord,
} from "../../lib/MessagingApiClient";
import {
  groupParticipantRoleLabel,
  MESSAGING_GROUP_PARTICIPANT_ROLES,
  type MessagingGroupParticipantRole,
} from "../../lib/messagingChatUi";
import type { GroupThreadParticipantPick } from "../../lib/messagingGroupThreadPick";
import { useChatModalFocusTrap } from "../../hooks/useChatModalFocusTrap";

type EditModalProps = {
  open: boolean;
  bodyText: string;
  busy: boolean;
  onBodyChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function ChatMessageEditModal({
  open,
  bodyText,
  busy,
  onBodyChange,
  onCancel,
  onSave,
}: EditModalProps) {
  const panelRef = useChatModalFocusTrap(open, onCancel);
  if (!open) {
    return null;
  }
  return (
    <div className="chat-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        ref={panelRef}
        className="chat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="chat-edit-title" className="chat-modal-title">
          Mesajı düzenle
        </h3>
        <p className="chat-modal-hint">Gönderimden sonra en fazla 5 dakika.</p>
        <textarea
          className="chat-modal-textarea"
          rows={5}
          value={bodyText}
          onChange={(event) => onBodyChange(event.target.value)}
        />
        <div className="chat-modal-actions">
          <button
            type="button"
            className="btn-account-secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Vazgeç
          </button>
          <button
            type="button"
            className="btn-accent"
            disabled={busy || !bodyText.trim()}
            onClick={onSave}
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

type DeleteModalProps = {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ChatMessageDeleteModal({
  open,
  busy,
  onCancel,
  onConfirm,
}: DeleteModalProps) {
  const panelRef = useChatModalFocusTrap(open, onCancel);
  if (!open) {
    return null;
  }
  return (
    <div className="chat-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        ref={panelRef}
        className="chat-modal chat-modal--compact"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="chat-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="chat-delete-title" className="chat-modal-title">
          Mesaj silinsin mi?
        </h3>
        <p className="chat-modal-hint">
          Karşı taraf &quot;[Mesaj silindi]&quot; görür; denetim kaydı saklanır.
        </p>
        <div className="chat-modal-actions">
          <button
            type="button"
            className="btn-account-secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Vazgeç
          </button>
          <button
            type="button"
            className="chat-compose-mode-btn chat-compose-mode-btn--active chat-compose-mode-btn--internal"
            disabled={busy}
            onClick={onConfirm}
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
};

type GroupModalProps = {
  open: boolean;
  busy: boolean;
  title: string;
  searchQuery: string;
  searchHits: MessagingCompanySearchRecord[];
  selected: GroupThreadParticipantPick[];
  onClose: () => void;
  onTitleChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onAddCompany: (company: MessagingCompanySearchRecord) => void;
  onRemoveCompany: (companyId: string) => void;
  onParticipantRoleChange: (
    companyId: string,
    role: MessagingGroupParticipantRole,
  ) => void;
  onCreate: () => void;
};

export function ChatGroupThreadModal({
  open,
  busy,
  title,
  searchQuery,
  searchHits,
  selected,
  onClose,
  onTitleChange,
  onSearchChange,
  onAddCompany,
  onRemoveCompany,
  onParticipantRoleChange,
  onCreate,
}: GroupModalProps) {
  const panelRef = useChatModalFocusTrap(open, onClose);
  if (!open) {
    return null;
  }
  const canCreate = selected.length >= 2 && !busy;
  return (
    <div className="chat-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="chat-modal chat-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-group-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="chat-group-title" className="chat-modal-title">
          Grup sohbet (3+ firma)
        </h3>
        <p className="chat-modal-hint">
          En az iki karşı firma seçin; siz otomatik dahil edilirsiniz. Her firmaya
          rol atayın (yükleyici / nakliyeci / acente / gözlemci).
        </p>
        <label className="chat-modal-label">
          Grup adı (isteğe bağlı)
          <input
            className="input-light"
            value={title}
            maxLength={120}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Örn. İstanbul–Berlin koridoru"
          />
        </label>
        <label className="chat-modal-label">
          Firma ara
          <input
            className="input-light"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Unvan (min 3 karakter)"
          />
        </label>
        {searchHits.length > 0 ? (
          <ul className="chat-group-search-hits">
            {searchHits.slice(0, 6).map((company) => (
              <li key={company.companyId}>
                <button
                  type="button"
                  className="chat-unified-search-option"
                  onClick={() => onAddCompany(company)}
                >
                  <span className="chat-unified-search-option-title">
                    {company.legalName}
                  </span>
                  <span className="chat-unified-search-option-sub">Ekle</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {selected.length > 0 ? (
          <ul className="chat-group-selected">
            {selected.map((company) => (
              <li key={company.companyId} className="chat-group-selected-row">
                <span className="chat-group-selected-name">{company.legalName}</span>
                <select
                  className="input-light chat-group-role-select"
                  aria-label={`${company.legalName} rolü`}
                  value={company.participantRole}
                  onChange={(event) =>
                    onParticipantRoleChange(
                      company.companyId,
                      event.target.value as MessagingGroupParticipantRole,
                    )
                  }
                >
                  {MESSAGING_GROUP_PARTICIPANT_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {groupParticipantRoleLabel(role)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="chat-pending-chip-remove"
                  aria-label="Kaldır"
                  onClick={() => onRemoveCompany(company.companyId)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="chat-modal-actions">
          <button
            type="button"
            className="btn-account-secondary"
            disabled={busy}
            onClick={onClose}
          >
            Vazgeç
          </button>
          <button
            type="button"
            className="btn-accent"
            disabled={!canCreate}
            onClick={onCreate}
          >
            Grup aç
          </button>
        </div>
      </div>
    </div>
  );
}

type QuickReplyAdminModalProps = {
  open: boolean;
  busy: boolean;
  templates: MessagingOrgQuickReplyRecord[];
  onClose: () => void;
  onChange: (templates: MessagingOrgQuickReplyRecord[]) => void;
  onSave: () => void;
};

export function ChatQuickReplyAdminModal({
  open,
  busy,
  templates,
  onClose,
  onChange,
  onSave,
}: QuickReplyAdminModalProps) {
  const panelRef = useChatModalFocusTrap(open, onClose);
  if (!open) {
    return null;
  }
  return (
    <div className="chat-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="chat-modal chat-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-templates-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="chat-templates-title" className="chat-modal-title">
          Şirket şablonları
        </h3>
        <p className="chat-modal-hint">
          En fazla 20 özel şablon. Sistem şablonları compose listesinde kalır.
        </p>
        <ul className="chat-template-admin-list">
          {templates.map((row, index) => (
            <li key={row.id || `row-${index}`} className="chat-template-admin-row">
              <input
                className="input-light"
                value={row.labelTr}
                placeholder="Kısa ad (TR)"
                maxLength={80}
                onChange={(event) => {
                  const next = templates.map((item, i) =>
                    i === index
                      ? { ...item, labelTr: event.target.value }
                      : item,
                  );
                  onChange(next);
                }}
              />
              <textarea
                className="chat-modal-textarea chat-template-admin-body"
                rows={2}
                value={row.bodyText}
                placeholder="Mesaj metni"
                maxLength={4000}
                onChange={(event) => {
                  const next = templates.map((item, i) =>
                    i === index
                      ? { ...item, bodyText: event.target.value }
                      : item,
                  );
                  onChange(next);
                }}
              />
              <button
                type="button"
                className="chat-pending-chip-remove"
                aria-label="Şablonu kaldır"
                onClick={() =>
                  onChange(templates.filter((_, i) => i !== index))
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn-account-secondary"
          disabled={templates.length >= 20 || busy}
          onClick={() =>
            onChange([
              ...templates,
              {
                id: `org-${Date.now()}`,
                labelTr: "",
                bodyText: "",
              },
            ])
          }
        >
          + Şablon ekle
        </button>
        <div className="chat-modal-actions">
          <button
            type="button"
            className="btn-account-secondary"
            disabled={busy}
            onClick={onClose}
          >
            Vazgeç
          </button>
          <button
            type="button"
            className="btn-accent"
            disabled={busy}
            onClick={onSave}
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
