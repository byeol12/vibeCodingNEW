"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

function joinErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid or expired")) {
    return "방 코드가 없거나 만료되었습니다.";
  }
  if (normalized.includes("another room")) {
    return "이 브라우저는 이미 다른 방에 참여하고 있습니다.";
  }
  if (normalized.includes("anonymous")) {
    return "선생님 계정과 학생 입장은 같은 브라우저에서 함께 사용할 수 없습니다.";
  }
  return "입장하지 못했습니다. 코드와 이름을 확인해 주세요.";
}

export function StudentJoinForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!hasSupabaseEnv()) {
      setError("먼저 Supabase 환경변수를 설정해 주세요.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const joinCode = String(formData.get("joinCode") || "")
      .trim()
      .toUpperCase();
    const name = String(formData.get("name") || "").trim();
    if (!/^[A-Z0-9]{6}$/.test(joinCode) || !name) {
      setError("6자리 방 코드와 이름을 입력해 주세요.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    let user = userData.user;

    if (user && !user.is_anonymous) {
      setPending(false);
      setError("선생님 계정과 학생 입장은 다른 브라우저에서 이용해 주세요.");
      return;
    }

    if (!user) {
      const { data, error: authError } = await supabase.auth.signInAnonymously();
      if (authError || !data.user) {
        setPending(false);
        setError("학생 세션을 만들지 못했습니다.");
        return;
      }
      user = data.user;
    }

    const { error: joinError } = await supabase.rpc("join_room", {
      p_join_code: joinCode,
      p_name: name,
    });

    if (joinError) {
      setPending(false);
      setError(joinErrorMessage(joinError.message));
      return;
    }

    router.replace("/me");
    router.refresh();
  }

  return (
    <form className="form-card join-form" onSubmit={handleSubmit}>
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      <label className="field">
        <span>6자리 방 코드</span>
        <input
          name="joinCode"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          maxLength={6}
          pattern="[A-Za-z0-9]{6}"
          placeholder="K7X2M9"
          required
        />
      </label>
      <label className="field">
        <span>학생 이름</span>
        <input name="name" autoComplete="name" maxLength={40} required />
      </label>
      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? "입장 중…" : "입장 요청"}
      </button>
      <p className="form-help">
        처음 입장하면 선생님의 승인을 기다립니다. 이메일 회원가입은 필요하지
        않습니다.
      </p>
    </form>
  );
}
