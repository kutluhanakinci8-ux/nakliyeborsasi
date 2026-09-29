"use client";

import type { MessagingCompanySearchRecord } from "../../lib/MessagingApiClient";

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
  if (!open) {
    return null;
  }
  return (
    <div className="chat-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="chat-modal"
        role="dialog"
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
  if (!open) {
    return null;
  }
  return (
    <div className="chat-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="chat-modal chat-modal--compact"
        role="alertdialog"
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
  selected: MessagingCompanySearchRecord[];
  onClose: () => void;
  onTitleChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onAddCompany: (company: MessagingCompanySearchRecord) => void;
  onRemoveCompany: (companyId: string) => void;
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
  onCreate,
}: GroupModalProps) {
  if (!open) {
    return null;
  }
  const canCreate = selected.length >= 2 && !busy;
  return (
    <div className="chat-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="chat-modal chat-modal--wide"
        role="dialog"
        aria-labelledby="chat-group-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="chat-group-title" className="chat-modal-title">
          Grup sohbet (3+ firma)
        </h3>
        <p className="chat-modal-hint">
          En az iki karşı firma seçin; siz otomatik dahil edilirsiniz.
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
              <li key={company.companyId} className="chat-pending-chip">
                <span>{company.legalName}</span>
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
