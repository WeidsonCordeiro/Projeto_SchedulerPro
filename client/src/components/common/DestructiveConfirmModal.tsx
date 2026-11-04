import { useEffect, useRef, type ReactNode } from "react";

export type DestructiveConfirmCancelVariant = "secondary" | "outline-secondary";

interface DestructiveConfirmModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  confirmLabel: string;
  submittingLabel: string;
  cancelLabel?: string;
  cancelButtonVariant?: DestructiveConfirmCancelVariant;
  centered?: boolean;
  titleId?: string;
  descriptionId?: string;
  focusCancelOnOpen?: boolean;
  closeOnEscape?: boolean;
  children: ReactNode;
}

export default function DestructiveConfirmModal({
  isOpen,
  title,
  onClose,
  onConfirm,
  isSubmitting,
  errorMessage = null,
  confirmLabel,
  submittingLabel,
  cancelLabel = "Cancelar",
  cancelButtonVariant = "secondary",
  centered = false,
  titleId,
  descriptionId,
  focusCancelOnOpen = false,
  closeOnEscape = false,
  children,
}: DestructiveConfirmModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && focusCancelOnOpen) {
      cancelButtonRef.current?.focus();
    }
  }, [isOpen, focusCancelOnOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, isSubmitting, onClose]);

  if (!isOpen) {
    return null;
  }

  const dialogAria: Record<string, string> = {
    "aria-modal": "true",
  };
  if (titleId) {
    dialogAria["aria-labelledby"] = titleId;
  }
  if (descriptionId) {
    dialogAria["aria-describedby"] = descriptionId;
  }

  return (
    <div className="modal show d-block" role="dialog" {...dialogAria}>
      <div
        className={`modal-dialog${centered ? " modal-dialog-centered" : ""}`}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h2
              id={titleId}
              className="modal-title h5"
            >
              {title}
            </h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={onClose}
              disabled={isSubmitting}
            />
          </div>

          <div className="modal-body">
            {children}

            {errorMessage && (
              <div className="alert alert-danger mt-3" role="alert">
                {errorMessage}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              ref={cancelButtonRef}
              type="button"
              className={`btn btn-${cancelButtonVariant}`}
              onClick={onClose}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <span
                  className="spinner-border spinner-border-sm me-1"
                  aria-hidden="true"
                />
              )}
              {isSubmitting ? submittingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
