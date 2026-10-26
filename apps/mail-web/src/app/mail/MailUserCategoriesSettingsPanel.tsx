"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createUserInboxCategory,
  deleteUserInboxCategory,
  fetchUserInboxCategories,
  updateUserInboxCategory,
} from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import {
  USER_CATEGORY_COLOR_KEYS,
  USER_CATEGORY_ICON_KEYS,
  UserCategoryTagIcon,
  userCategoryColors,
  type MailUserInboxCategory,
} from "@/lib/mailUserInboxCategoryUi";

type Props = {
  accessToken: string;
  onCategoriesChanged?: () => void;
};

export function MailUserCategoriesSettingsPanel({
  accessToken,
  onCategoriesChanged,
}: Props) {
  const { t } = useMailLocale();
  const [categories, setCategories] = useState<MailUserInboxCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { categories: rows } = await fetchUserInboxCategories(accessToken);
      setCategories(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settingsCategoriesLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [accessToken, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onAdd() {
    setBusyId("__new");
    try {
      const { category } = await createUserInboxCategory(accessToken, {
        name: t("settingsCategoriesNewDefaultName"),
        colorKey: "blue",
        iconKey: "tag",
      });
      setCategories((prev) => [...prev, category]);
      onCategoriesChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settingsCategoriesSaveFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function onSave(row: MailUserInboxCategory) {
    setBusyId(row.id);
    try {
      const { category } = await updateUserInboxCategory(accessToken, row.id, {
        name: row.name,
        colorKey: row.colorKey,
        iconKey: row.iconKey,
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? category : c)),
      );
      onCategoriesChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settingsCategoriesSaveFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(id: string) {
    setBusyId(id);
    try {
      await deleteUserInboxCategory(accessToken, id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      onCategoriesChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settingsCategoriesDeleteFailed"));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="mail-settings-muted">{t("settingsLoading")}</p>;
  }

  return (
    <div className="mail-user-categories-settings">
      <p className="mail-settings-intro">{t("settingsCategoriesIntro")}</p>
      {error ? <p className="mail-settings-error" role="alert">{error}</p> : null}
      <ul className="mail-user-categories-list">
        {categories.map((row) => (
          <li key={row.id} className="mail-user-categories-row">
            <span
              className="mail-user-categories-row-icon"
              style={{ background: userCategoryColors(row.colorKey).bg }}
            >
              <UserCategoryTagIcon
                iconKey={row.iconKey}
                colorKey={row.colorKey}
                size={18}
              />
            </span>
            <input
              type="text"
              className="mail-user-categories-name"
              value={row.name}
              onChange={(e) =>
                setCategories((prev) =>
                  prev.map((c) =>
                    c.id === row.id ? { ...c, name: e.target.value } : c,
                  ),
                )
              }
              aria-label={t("settingsCategoriesNameAria")}
            />
            <select
              className="mail-user-categories-select"
              value={row.colorKey}
              onChange={(e) =>
                setCategories((prev) =>
                  prev.map((c) =>
                    c.id === row.id ? { ...c, colorKey: e.target.value } : c,
                  ),
                )
              }
              aria-label={t("settingsCategoriesColorAria")}
            >
              {USER_CATEGORY_COLOR_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`userCategoryColor_${key}`)}
                </option>
              ))}
            </select>
            <select
              className="mail-user-categories-select"
              value={row.iconKey}
              onChange={(e) =>
                setCategories((prev) =>
                  prev.map((c) =>
                    c.id === row.id ? { ...c, iconKey: e.target.value } : c,
                  ),
                )
              }
              aria-label={t("settingsCategoriesIconAria")}
            >
              {USER_CATEGORY_ICON_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`userCategoryIcon_${key}`)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="mail-toolbar-btn"
              disabled={busyId === row.id}
              onClick={() => void onSave(row)}
            >
              {t("settingsCategoriesSave")}
            </button>
            <button
              type="button"
              className="mail-toolbar-btn mail-bulk-danger"
              disabled={busyId === row.id}
              onClick={() => void onDelete(row.id)}
            >
              {t("settingsCategoriesDelete")}
            </button>
            <span className="mail-user-categories-count">
              {t("settingsCategoriesMessageCount", {
                count: row.messageCount ?? 0,
              })}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="compose-btn compose-btn--secondary"
        disabled={busyId === "__new"}
        onClick={() => void onAdd()}
      >
        {t("settingsCategoriesAdd")}
      </button>
    </div>
  );
}
