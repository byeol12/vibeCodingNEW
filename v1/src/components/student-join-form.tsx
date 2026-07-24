"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

function joinErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid or expired")) {
    return "방 코드가 없거나 만료되었습니다. 선생님 화면의 6자리 코드를 다시 확인해 주세요.";
  }
  if (normalized.includes("another room")) {
    return "이 브라우저는 이미 다른 방에 참여하고 있습니다. 아래 ‘세션 초기화’ 후 다시 시도하세요.";
  }
  if (normalized.includes("anonymous")) {
    return "선생님 계정과 학생 입장은 같은 브라우저에서 함께 사용할 수 없습니다. InPrivate(시크릿) 창을 열어 주세요.";
  }
  return "입장하지 못했습니다. 코드와 이름을 확인해 주세요.";
}

export function StudentJoinForm() {
  const [pending, setPending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");

  async function resetSession() {
    setError("");
    setResetting(true);
    try {
      if (hasSupabaseEnv()) {
        const supabase = createClient();
        await supabase.auth.signOut({ scope: "local" });
      }
      window.location.assign("/join");
    } catch {
      setResetting(false);
      setError("세션을 초기화하지 못했습니다. 시크릿 창을 새로 열어 주세요.");
    }
  }

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
      setError(
        "지금 브라우저에 선생님 로그인이 남아 있어요. InPrivate(시크릿) 창에서 입장하거나, 아래 ‘세션 초기화’를 눌러 주세요.",
      );
      return;
    }

    if (!user) {
      const { data, error: authError } = await supabase.auth.signInAnonymously();
      if (authError || !data.user) {
        setPending(false);
        setError(
          authError?.message?.toLowerCase().includes("anonymous")
            ? "익명 로그인이 꺼져 있을 수 있어요. Supabase Authentication → Providers에서 Anonymous를 켜 주세요."
            : "학생 세션을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
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

    // App Router soft navigation은 쿠키 반영 전에 /me로 갈 수 있어 전체 이동한다.
    window.location.assign("/me");
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
      <button
        className="button"
        type="button"
        disabled={pending || resetting}
        onClick={resetSession}
      >
        {resetting ? "초기화 중…" : "세션 초기화"}
      </button>
      <p className="form-help">
        학생 화면은 <strong>/me</strong> 입니다. 선생님 방 주소(/room/…)로는
        들어가지 마세요. 선생님과 같은 브라우저면 InPrivate(시크릿) 창을 쓰세요.
        처음 입장하면 선생님 승인 대기 상태가 됩니다.
      </p>
    </form>
  );
}
