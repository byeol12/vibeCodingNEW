# v0에서 v1으로 이식하는 기준

## 원칙

- `../v0/index.html`, `../v0/style.css`, `../v0/script.js`는 검증된 v0 기준본으로 유지한다.
- localStorage를 페이지 로딩 중 자동 업로드하지 않는다.
- 교사가 JSON을 내보내고, 미리보기에서 학생·기간·건수를 확인한 뒤 한 번만 가져온다.
- 동일 학생·수업일은 `unique(student_id, session_id)`를 기준으로 upsert한다.
- 이미지 data URL은 640px 안팎의 JPEG/WebP로 다시 인코딩한 뒤 비공개 `card-art` 버킷에 올린다.

## 상태 대응표

| v0 `defaultState()` | v1 저장 위치 | 처리 |
| --- | --- | --- |
| `student` | `students` | 방과 익명 Auth 사용자에 연결 |
| `program` | `rooms`, `sessions` | 날짜를 서버에서 다시 생성하고 결과를 비교 |
| `records.*` 평가 3항목·메모·럭키·조커 | `evaluations` | 교사 소유 데이터로 이식 |
| `records.*.praise/struggle` | `reflections` | 학생 자기관찰로 분리 |
| `shopItems` | `shop_items` | 프레임 항목은 제외 |
| `purchases` | `purchases` | 당시 가격을 `price_paid`로 보존 |
| `cardArt` | Storage + `card_arts` | 등급별 파일로 변환 |
| `reflections` | `weekly_reflections` | 주 시작일과 선택값으로 변환 |
| `perfectWeeks`, `bestStreak` | 저장하지 않음 | 평가 기록에서 재계산 |
| `frame`, `frameOwned` | 이식하지 않음 | v1은 등급별 자동 프레임 |

`jokers`, `recoveryAwards`, `bonusPoints`는 일일 평가만으로 복원할 수 없다. `bonus_events`와 `joker_events` 원장에 원본 이벤트와 수동 보너스를 감사 가능한 행으로 이식한다.

## 코드 이식 위치

- `buildSessionModel()` → 서버 전용 수업일 생성 서비스. 월 경계를 넘는 주를 각 월의 별도 주차로 계산하는 v0 규칙을 유지한다.
- `recordPoints()` → 순수 TypeScript 도메인 함수와 `evaluation_points` SQL 뷰의 공통 테스트 벡터.
- `computeDerived()` → 서버 집계 함수. 카드 등급, 스트릭, 포인트, 회복 상태를 한 번에 계산한다.
- `drawCard()` → 클라이언트 전용 Canvas 모듈. DB·Auth 접근 없이 카드 DTO만 입력받는다.
- `migrateFromV8()` → v1 런타임에 넣지 않는다. 별도의 교사용 일회성 가져오기 도구에서만 사용한다.

## 가져오기 검증

1. JSON 스키마 버전과 필수 키를 검사한다.
2. 프로그램 날짜로 생성한 수업일과 원본 날짜를 대조한다.
3. 학생, 평가, 자기관찰, 구매, 이미지 건수를 미리 보여준다.
4. 교사 확인 후 하나의 서버 작업으로 가져온다.
5. 성공·실패 행과 제외 사유를 다운로드 가능한 결과로 남긴다.

## v1 UI

- 경로: `/dashboard/import`
- v0의 “JSON 내보내기”로 만든 파일을 올린다.
- 활성 학생을 고른 뒤 미리보기를 확인하고 가져온다.
- 주간 성찰 값 매핑: `sleep→sleep`, `plan→planning`, `teacher→teacher`, `phone_away→phone-away`.
- 프레임 상점 항목은 v1 등급 프레임 정책상 제외한다.
- 가져오기 결과 메시지에 성공 건수와 제외 사유를 함께 표시한다.
