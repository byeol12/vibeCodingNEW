"use client";

import { useSyncExternalStore } from "react";

type RecoveryPromptProps = {
  breakSessionId: string;
  bestStreak: number;
  progress: number;
  awarded?: boolean;
};

const storageKey = (breakSessionId: string) =>
  `dojang-dismiss-recovery:${breakSessionId}`;

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function isDismissed(breakSessionId: string) {
  try {
    return Boolean(sessionStorage.getItem(storageKey(breakSessionId)));
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

function dismiss(breakSessionId: string) {
  try {
    sessionStorage.setItem(storageKey(breakSessionId), "1");
  } catch {
    // ignore private mode
  }
  notify();
}

export function RecoveryPrompt({
  breakSessionId,
  bestStreak,
  progress,
  awarded = false,
}: RecoveryPromptProps) {
  const remaining = Math.max(0, 3 - progress);
  const dismissed = useSyncExternalStore(
    subscribe,
    () => isDismissed(breakSessionId),
    getServerSnapshot,
  );

  if (awarded || remaining <= 0 || dismissed) return null;

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
        onClick={() => dismiss(breakSessionId)}
      >
        알겠어요
      </button>
    </aside>
  );
}
