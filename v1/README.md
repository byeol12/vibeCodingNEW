# 도장 스트릭 v1

Next.js 16.2 App Router, TypeScript, Tailwind CSS, Supabase로 구성한 v1 기반 프로젝트다. 현재 단계에는 라우트·인증·DB·RLS 골격만 포함한다.

## 로컬 실행

```bash
npm install
copy .env.example .env.local
npm run dev
```

`.env.local`에 Supabase 프로젝트의 URL과 publishable key를 입력한다. service-role key는 이 프로젝트에 넣지 않는다.

## Supabase 설정

1. Supabase 프로젝트에서 Anonymous Sign-Ins를 활성화한다.
2. Supabase CLI로 프로젝트를 연결한다.
3. `supabase/migrations/0001_schema.sql`, `0002_rls.sql` 순서로 적용한다.
4. Storage의 `card-art` 버킷과 정책이 생성됐는지 확인한다.
5. 교사·학생 테스트 사용자로 RLS 경계를 검증한다.

로컬 Supabase를 사용할 때는 프로젝트 루트에서 다음 형태로 실행한다.

```bash
supabase start
supabase db reset
```

Supabase CLI와 Docker 설치는 저장소에 포함하지 않는다.

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
