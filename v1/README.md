# 도장 스트릭 v1

Next.js 16.2 App Router, TypeScript, Tailwind CSS, Supabase로 구성한 v1 프로젝트다. 현재 교사 인증, 방·수업일 생성, 학생 익명 입장과 승인, 일일 평가, 자기관찰, 포인트·등급 카드, 보상 상점·구매·승인, 카드 아트, 조커·보너스 원장, 차트, PWA 설치까지 구현되어 있다.

## 로컬 실행

```bash
npm install
copy .env.example .env.local
npm run dev
```

`.env.local`에 Supabase 프로젝트의 URL, publishable key, 실행 주소를 입력한다. service-role key는 이 프로젝트에 넣지 않는다.

## 현재 클라우드 연결

- 프로젝트 ref: `bpaulqhnxquanakmlfua`
- 원격 마이그레이션: `0001`–`0008` 적용 필요 (`0008`은 교사 수동 보너스 insert 정책)
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

적용 파일은 `0001`–`0008`이다. 적용 후 비공개 `card-art` 버킷이 생성됐는지 확인한다.

## Vercel 배포

1. Vercel에서 `v1/`을 Root Directory로 연결한다.
2. Environment Variables에 아래를 넣는다.

| 변수 | 값 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |

3. Supabase Authentication → URL Configuration에 배포 URL을 Site URL / Redirect URL로 추가한다.
4. 아직 안 했다면 `npx supabase db push`로 `0001`–`0008` 마이그레이션을 적용한다.
5. 배포 후 `/join`, 교사 로그인, 학생 입장·카드 저장까지 한 번씩 확인한다.

`vercel.json`은 기본 Next.js 설정으로 충분해 두지 않았다. 필요하면 나중에 리다이렉트·헤더만 추가한다.

## 통합 확인 순서

1. 선생님 회원가입 후 확인 이메일 링크로 로그인한다.
2. 방을 만들고 6자리 코드와 생성된 수업일을 확인한다.
3. 다른 브라우저 또는 시크릿 창에서 학생 코드를 입력한다.
4. 승인 전에는 학생 홈에 대기 상태만 보이는지 확인한다.
5. 교사가 승인한 뒤 학생이 카드·상점 메뉴를 볼 수 있는지 확인한다.
6. 교사 방의 상점에 기본 보상이 없으면 `기본 보상 채우기`를 실행한다.
7. 학생이 포인트로 구매 요청 → 교사 `/room/.../approve`에서 승인·거절을 확인한다.
8. 다른 교사 계정에서 해당 방 URL과 데이터를 볼 수 없는지 확인한다.

## PWA

프로덕션(`npm run build && npm start`)에서 서비스 워커가 등록된다. 모바일 브라우저에서 ‘홈 화면에 추가’로 설치할 수 있다. 오프라인일 때는 캐시된 셸과 `/offline.html`을 보여 주며, 실시간 평가·구매 데이터는 온라인에서만 갱신된다.

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
