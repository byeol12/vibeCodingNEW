# 도장 스트릭 v1

Next.js 16.2 App Router, TypeScript, Tailwind CSS, Supabase로 구성한 v1 프로젝트다. 현재 교사 인증, 방·수업일 생성, 학생 익명 입장과 승인, 일일 평가, 자기관찰, 포인트·등급 카드, 보상 상점·구매·승인, 카드 아트 업로드까지 구현되어 있다.

## 로컬 실행

```bash
npm install
copy .env.example .env.local
npm run dev
```

`.env.local`에 Supabase 프로젝트의 URL, publishable key, 실행 주소를 입력한다. service-role key는 이 프로젝트에 넣지 않는다.

## 현재 클라우드 연결

- 프로젝트 ref: `bpaulqhnxquanakmlfua`
- 원격 마이그레이션: `0001`–`0004` 적용 완료
- Email Auth와 Anonymous Sign-Ins 활성화 완료
- 비로그인 `rooms` 조회 401 차단 확인
- DB 타입: `src/lib/supabase/database.types.ts`

스키마를 변경한 뒤에는 다음 명령으로 원격 적용과 타입 갱신을 함께 수행한다. PowerShell에서는 리다이렉트가 UTF-16이 될 수 있으니 UTF-8로 다시 저장한다.

```bash
npx supabase@latest db push
npx supabase@latest gen types typescript --linked > tmp-types.ts
```

## Supabase 클라우드 설정

1. Supabase Dashboard에서 새 프로젝트를 만든다.
2. Authentication의 Providers에서 Anonymous Sign-Ins를 활성화한다.
3. Authentication의 URL Configuration에 Site URL `http://localhost:3000`, Redirect URL `http://localhost:3000/auth/callback`을 등록한다. 배포할 때는 Vercel 주소도 추가한다.
4. Project Settings의 API에서 Project URL과 publishable key를 복사해 `.env.local`에 입력한다.
5. Supabase CLI로 프로젝트를 연결하고 세 마이그레이션을 순서대로 적용한다.

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

적용 파일은 `0001_schema.sql`, `0002_rls.sql`, `0003_auth_and_rooms.sql`, `0004_shop_and_purchases.sql`이다. 적용 후 비공개 `card-art` 버킷이 생성됐는지 확인한다.

## 통합 확인 순서

1. 선생님 회원가입 후 확인 이메일 링크로 로그인한다.
2. 방을 만들고 6자리 코드와 생성된 수업일을 확인한다.
3. 다른 브라우저 또는 시크릿 창에서 학생 코드를 입력한다.
4. 승인 전에는 학생 홈에 대기 상태만 보이는지 확인한다.
5. 교사가 승인한 뒤 학생이 카드·상점 메뉴를 볼 수 있는지 확인한다.
6. 교사 방의 상점에 기본 보상이 없으면 `기본 보상 채우기`를 실행한다.
7. 학생이 포인트로 구매 요청 → 교사 `/room/.../approve`에서 승인·거절을 확인한다.
8. 다른 교사 계정에서 해당 방 URL과 데이터를 볼 수 없는지 확인한다.

## 검사

```bash
npm run lint
npm run typecheck
npm run build
```

전체 검사는 `npm run check`로 실행한다.

## 알려진 의존성 경고

2026-07-24 기준 최신 안정판 Next.js 16.2.11이 내부적으로 PostCSS 8.4.31과 Sharp 0.34.5를 고정해 `npm audit --omit=dev`에 high 3건이 표시된다. `npm audit fix --force`는 Next.js 9로 잘못 다운그레이드하므로 실행하지 않는다. Next.js 패치 릴리스를 추적하고, Sharp 강제 override는 일부 배포 환경의 런타임 충돌이 해결된 뒤 적용한다.

## 문서

- `docs/architecture.md`: 인증, 권한, 데이터 흐름
- `docs/domain-rules.md`: 포인트, 등급, 스트릭 규칙
- `docs/v0-migration.md`: 기존 localStorage 데이터 이식 기준
