import { useEffect } from "react";

interface ConfirmDialogFocusOptions {
  open: boolean;
  busy: boolean;
  dialogRef: { current: HTMLDivElement | null };
  initialFocusRef: { current: HTMLElement | null };
  onRequestClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Shared confirm-dialog focus management [ui-spec §10]: Tab-cycle wrapping,
 * Escape to close, and containment.
 *
 * The containment guard pulls focus back inside when it escapes via a click
 * outside or a programmatic .focus() elsewhere -- Tab wrapping alone cannot
 * catch those. The dialog container itself carries tabIndex -1 so the guard
 * always has a fallback target. Containment stays active while `busy` so
 * focus cannot escape an open dialog mid-request; only the Escape-to-close
 * path is gated by `busy` (BR-18 in-flight lockout), never the containment.
 */
export function useConfirmDialogFocus({
  open,
  busy,
  dialogRef,
  initialFocusRef,
  onRequestClose,
}: ConfirmDialogFocusOptions): void {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!busy) onRequestClose();
      } else if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const items = focusablesIn(dialog);
        if (items.length === 0) return;

        const firstElement = items[0];
        const lastElement = items[items.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const target = e.target as Node | null;
      if (target && !dialog.contains(target)) {
        const items = focusablesIn(dialog);
        (items[0] ?? dialog).focus();
        // While busy every action is disabled, and focusing a disabled
        // control is a no-op (jsdom and browsers alike) -- fall back to the
        // dialog container itself so focus still cannot escape mid-request.
        if (!dialog.contains(document.activeElement)) {
          dialog.focus();
        }
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    window.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => initialFocusRef.current?.focus(), 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [open, busy, dialogRef, initialFocusRef, onRequestClose]);
}
