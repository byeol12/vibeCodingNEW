import Link from "next/link";
import { redirect } from "next/navigation";
import { signInTeacher, signUpTeacher } from "@/app/auth/actions";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import { getViewer } from "@/lib/auth/viewer";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomePageProps) {
  const viewer = await getViewer();
  if (viewer?.role === "teacher") redirect("/dashboard");
  if (viewer?.role === "student") redirect("/me");

  const query = await searchParams;
  const error = first(query.error);
  const message = first(query.message);
  const setupRequired = first(query.setup) === "required";

  return (
    <AppShell
      eyebrow="Teacher-led motivation"
      title="관찰이 카드가 되고, 카드가 다음 행동을 만듭니다."
      description="선생님은 수업을 만들고 평가하며, 학생은 방 코드 하나로 바로 참여합니다."
    >
      {(error || setupRequired) && (
        <p className="alert alert--error" role="alert">
          {error || "Supabase 연결 후 선생님 기능을 사용할 수 있습니다."}
        </p>
      )}
      {message && (
        <p className="alert alert--success" role="status">
          {message}
        </p>
      )}

      <div className="auth-grid">
        <form className="form-card" action={signInTeacher}>
          <div>
            <p className="eyebrow">Teacher login</p>
            <h2>선생님 로그인</h2>
          </div>
          <label className="field">
            <span>이메일</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            <span>비밀번호</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <SubmitButton pendingLabel="로그인 중…">로그인</SubmitButton>
        </form>

        <form className="form-card" action={signUpTeacher}>
          <div>
            <p className="eyebrow">Create account</p>
            <h2>선생님 회원가입</h2>
          </div>
          <label className="field">
            <span>이름</span>
            <input name="displayName" autoComplete="name" required maxLength={80} />
          </label>
          <label className="field">
            <span>이메일</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            <span>비밀번호</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>
          <SubmitButton pendingLabel="가입 중…">회원가입</SubmitButton>
        </form>
      </div>

      <div className="student-entry">
        <div>
          <strong>학생인가요?</strong>
          <span>이메일 없이 6자리 방 코드로 입장할 수 있어요.</span>
        </div>
        <Link className="button" href="/join">
          학생 입장
        </Link>
      </div>
    </AppShell>
  );
}
