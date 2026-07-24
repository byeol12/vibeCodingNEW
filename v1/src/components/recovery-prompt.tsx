"use client";

import { useEffect, useState } from "react";

type RecoveryPromptProps = {
  breakSessionId: string;
  bestStreak: number;
  progress: number;
  awarded?: boolean;
};

const storageKey = (breakSessionId: string) =>
  `dojang-dismiss-recovery:${breakSessionId}`;

export function RecoveryPrompt({
  breakSessionId,
  bestStreak,
  progress,
  awarded = false,
}: RecoveryPromptProps) {
  const remaining = Math.max(0, 3 - progress);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (awarded || remaining <= 0) {
      setVisible(false);
      return;
    }
    try {
      if (sessionStorage.getItem(storageKey(breakSessionId))) {
        setVisible(false);
        return;
      }
    } catch {
      // ignore private mode
    }
    setVisible(true);
  }, [awarded, breakSessionId, remaining]);

  if (!visible) return null;

  return (
    <aside className="recovery-prompt" role="note">
      <h3>연속이 끊겼어요</h3>
      <p>
        하지만 최고 기록 <strong>{Math.max(bestStreak, 1)}일</strong>은
        그대로예요.
      </p>
      <p>
        <strong>{remaining}일</strong>만 다시 이어가면 리커버리 보너스 +10P!
      </p>
      <button
        type="button"
        className="button"
        onClick={() => {
          try {
            sessionStorage.setItem(storageKey(breakSessionId), "1");
          } catch {
            // ignore
          }
          setVisible(false);
        }}
      >
        알겠어요
      </button>
    </aside>
  );
}
