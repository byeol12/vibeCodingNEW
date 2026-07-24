"use client";

import { useState, useTransition } from "react";
import { signOut } from "@/app/auth/actions";

export function SignOutButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="button button--signout"
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        로그아웃
      </button>

      {open ? (
        <div
          className="confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-confirm-title"
        >
          <div className="confirm-dialog__backdrop" onClick={() => setOpen(false)} />
          <div className="confirm-dialog__panel">
            <h2 id="signout-confirm-title">나가겠습니까?</h2>
            <p>이 브라우저에서 학생 세션이 종료돼요.</p>
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
                className="button button--primary"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await signOut();
                  });
                }}
              >
                {pending ? "나가는 중…" : "예"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
