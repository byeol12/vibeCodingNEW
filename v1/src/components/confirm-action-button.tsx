"use client";

import { useState, useTransition } from "react";

type ConfirmActionButtonProps = {
  action: () => Promise<void> | void;
  label: string;
  pendingLabel?: string;
  className?: string;
  title: string;
  message: string;
  confirmLabel?: string;
};

export function ConfirmActionButton({
  action,
  label,
  pendingLabel = "처리 중…",
  className = "button",
  title,
  message,
  confirmLabel = "예",
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        {label}
      </button>

      {open ? (
        <div
          className="confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-action-title"
        >
          <div
            className="confirm-dialog__backdrop"
            onClick={() => setOpen(false)}
          />
          <div className="confirm-dialog__panel">
            <h2 id="confirm-action-title">{title}</h2>
            <p>{message}</p>
            <div className="confirm-dialog__actions">
              <button
                type="button"
                className="button"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                아니오
              </button>
              <button
                type="button"
                className="button button--danger"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await action();
                    setOpen(false);
                  });
                }}
              >
                {pending ? pendingLabel : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
