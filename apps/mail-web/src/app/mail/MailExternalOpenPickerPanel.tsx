"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import {
  DIRECTIONS_APP_OPTIONS,
  LINK_BROWSER_OPTIONS,
  type DirectionsAppId,
  type LinkBrowserId,
  readDirectionsApp,
  EXTERNAL_OPEN_PREFS_EVENT,
  readLinkBrowser,
  writeDirectionsApp,
  writeLinkBrowser,
} from "@/lib/mailExternalOpenPrefs";
import {
  IconAppleMaps,
  IconChrome,
  IconCitymapper,
  IconEdge,
  IconFirefox,
  IconGlobeSystem,
  IconGoogleMaps,
  IconMapsSystem,
  IconOpera,
  IconSafari,
  IconWaze,
  IconYandexMaps,
} from "./MailExternalOpenBrandIcons";

type PickerKind = "links" | "directions";

type Props = {
  kind: PickerKind;
};

function linkIcon(id: LinkBrowserId): ReactNode {
  switch (id) {
    case "edge":
      return <IconEdge />;
    case "firefox":
      return <IconFirefox />;
    case "safari":
      return <IconSafari />;
    case "chrome":
      return <IconChrome />;
    case "opera":
      return <IconOpera />;
    case "system":
      return <IconGlobeSystem />;
    default:
      return <IconGlobeSystem />;
  }
}

function directionsIcon(id: DirectionsAppId): ReactNode {
  switch (id) {
    case "apple-maps":
      return <IconAppleMaps />;
    case "google-maps":
      return <IconGoogleMaps />;
    case "waze":
      return <IconWaze />;
    case "yandex":
      return <IconYandexMaps />;
    case "citymapper":
      return <IconCitymapper />;
    case "system":
      return <IconMapsSystem />;
    default:
      return <IconMapsSystem />;
  }
}

export function MailExternalOpenPickerPanel({ kind }: Props) {
  const { t } = useMailLocale();
  const [selectedLink, setSelectedLink] = useState(readLinkBrowser);
  const [selectedDirections, setSelectedDirections] = useState(readDirectionsApp);

  useEffect(() => {
    const sync = () => {
      setSelectedLink(readLinkBrowser());
      setSelectedDirections(readDirectionsApp());
    };
    window.addEventListener(EXTERNAL_OPEN_PREFS_EVENT, sync);
    return () => window.removeEventListener(EXTERNAL_OPEN_PREFS_EVENT, sync);
  }, []);

  const introKey =
    kind === "links" ? "externalOpenLinksIntro" : "externalOpenDirectionsIntro";

  return (
    <div className="mail-external-open-picker">
      <p className="mail-settings-intro">{t(introKey)}</p>
      <ul className="mail-help-ios-group mail-external-open-list">
        {kind === "links"
          ? LINK_BROWSER_OPTIONS.map((id) => {
              const selected = selectedLink === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={
                      selected
                        ? "mail-external-open-row mail-external-open-row--selected"
                        : "mail-external-open-row"
                    }
                    onClick={() => {
                      writeLinkBrowser(id);
                      setSelectedLink(id);
                    }}
                  >
                    <span className="mail-external-open-row-icon">{linkIcon(id)}</span>
                    <span className="mail-external-open-row-text">
                      <strong>{t(`externalOpenLink_${id}_name`)}</strong>
                      <small>{t(`externalOpenLink_${id}_sub`)}</small>
                    </span>
                    {selected ? (
                      <span className="mail-external-open-check" aria-hidden="true">✓</span>
                    ) : null}
                  </button>
                </li>
              );
            })
          : DIRECTIONS_APP_OPTIONS.map((id) => {
              const selected = selectedDirections === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={
                      selected
                        ? "mail-external-open-row mail-external-open-row--selected"
                        : "mail-external-open-row"
                    }
                    onClick={() => {
                      writeDirectionsApp(id);
                      setSelectedDirections(id);
                    }}
                  >
                    <span className="mail-external-open-row-icon">
                      {directionsIcon(id)}
                    </span>
                    <span className="mail-external-open-row-text">
                      <strong>{t(`externalOpenDirections_${id}_name`)}</strong>
                      <small>{t(`externalOpenDirections_${id}_sub`)}</small>
                    </span>
                    {selected ? (
                      <span className="mail-external-open-check" aria-hidden="true">✓</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
      </ul>
    </div>
  );
}

export function externalOpenLinkBrowserLabel(
  id: LinkBrowserId,
  t: (key: string) => string,
): string {
  return t(`externalOpenLink_${id}_name`);
}

export function externalOpenDirectionsAppLabel(
  id: DirectionsAppId,
  t: (key: string) => string,
): string {
  return t(`externalOpenDirections_${id}_name`);
}
