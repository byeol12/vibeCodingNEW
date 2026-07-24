"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SoftRefreshProps = {
  /** Poll interval in ms while waiting. 0 disables polling. */
  intervalMs?: number;
  label?: string;
};

export function SoftRefresh({
  intervalMs = 12000,
  label = "상태 새로고침",
}: SoftRefreshProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!intervalMs) return;
    const id = window.setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, router]);

  return (
    <button
      type="button"
      className="button button--refresh"
      disabled={pending}
      onClick={() => {
        setPending(true);
        router.refresh();
        window.setTimeout(() => setPending(false), 600);
      }}
    >
      {pending ? "확인 중…" : label}
    </button>
  );
}
