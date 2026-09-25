import { useEffect } from "react";

type Handlers = {
  onCompose: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onSnooze1h: () => void;
  onFocusSearch: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onMarkUnread: () => void;
  onForward: () => void;
  onToggleStar: () => void;
  onListNext: () => void;
  onListPrev: () => void;
  onShowHelp: () => void;
  onEscape: () => void;
  enabled: boolean;
  listNavigationEnabled: boolean;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function useMailKeyboardShortcuts(handlers: Handlers) {
  useEffect(() => {
    if (!handlers.enabled) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        if (event.key === "Escape") {
          handlers.onEscape();
        }
        return;
      }
      if (event.key === "?" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        handlers.onShowHelp();
        return;
      }
      if (event.key === "Escape") {
        handlers.onEscape();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      switch (event.key) {
        case "c":
          event.preventDefault();
          handlers.onCompose();
          break;
        case "r":
          event.preventDefault();
          handlers.onReply();
          break;
        case "a":
          event.preventDefault();
          handlers.onReplyAll();
          break;
        case "z":
          event.preventDefault();
          handlers.onSnooze1h();
          break;
        case "/":
          event.preventDefault();
          handlers.onFocusSearch();
          break;
        case "e":
          event.preventDefault();
          handlers.onArchive();
          break;
        case "#":
          event.preventDefault();
          handlers.onTrash();
          break;
        case "u":
          event.preventDefault();
          handlers.onMarkUnread();
          break;
        case "f":
          event.preventDefault();
          handlers.onForward();
          break;
        case "s":
          event.preventDefault();
          handlers.onToggleStar();
          break;
        case "j":
          if (handlers.listNavigationEnabled) {
            event.preventDefault();
            handlers.onListNext();
          }
          break;
        case "k":
          if (handlers.listNavigationEnabled) {
            event.preventDefault();
            handlers.onListPrev();
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
