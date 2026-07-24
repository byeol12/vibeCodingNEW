"use client";

import { useRouter } from "next/navigation";

type SessionOption = {
  id: string;
  label: string;
};

type SessionSelectProps = {
  roomId: string;
  sessions: SessionOption[];
  selectedId?: string;
};

export function SessionSelect({
  roomId,
  sessions,
  selectedId,
}: SessionSelectProps) {
  const router = useRouter();

  return (
    <label className="field session-picker__field">
      <span>평가할 수업일</span>
      <select
        value={selectedId || ""}
        onChange={(event) => {
          const next = event.target.value;
          router.push(`/room/${roomId}?session=${encodeURIComponent(next)}`);
        }}
      >
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {session.label}
          </option>
        ))}
      </select>
    </label>
  );
}
