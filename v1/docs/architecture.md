# v1 기반 아키텍처

## 경계

- 교사는 Supabase 이메일 Auth의 정식 사용자다.
- 학생은 회원가입 화면 없이 Supabase anonymous Auth 세션을 사용한다.
- 익명 세션은 6자리 방 코드로 `join_room()` RPC를 호출하고 `students.status = pending` 상태로 생성된다.
- 교사가 학생을 승인하면 해당 방의 평가·카드·상점 데이터에 접근할 수 있다.
- 브라우저는 publishable key만 사용한다. service-role key는 현재 기반과 클라이언트 코드에 두지 않는다.

## 데이터 흐름

```mermaid
flowchart LR
  Teacher[교사Auth] --> TeacherPages[교사라우트]
  Student[학생익명Auth] --> JoinRoom[join_room RPC]
  JoinRoom --> Approval[교사승인]
  Approval --> StudentPages[학생라우트]
  TeacherPages --> Evaluation[교사평가]
  StudentPages --> Reflection[학생자기관찰]
  Evaluation --> Derived[포인트등급스트릭계산]
  Reflection --> Derived
  Derived --> Card[등급카드]
  Derived --> ShopBalance[상점잔액]
  StudentPages --> Purchase[request_purchase RPC]
  Purchase --> TeacherApprove[교사승인]
  TeacherApprove --> ShopBalance
```

## 권한 확인 위치

1. `proxy.ts`는 세션 쿠키를 갱신하고 보호 경로의 무세션 접근을 돌려보낸다.
2. Server Component는 `requireTeacher()` 또는 `requireStudent()`로 실제 JWT와 DB 역할을 다시 확인한다.
3. 모든 데이터 접근은 RLS를 최종 권한 경계로 사용한다.
4. 구매 한도·중복 pending은 `request_purchase` RPC에서 검사한다. 잔액은 서버 액션에서 평가·구매 내역으로 계산한 뒤 RPC를 호출한다(잔액 원자 검사는 후속 강화).

## Storage 경로

카드 이미지는 `card-art` 버킷 안의 `{room_id}/{grade}/{file}` 경로를 사용한다. 버킷은 비공개이며 방 교사만 쓰고 승인된 방 구성원만 읽는다. UI는 signed URL로 미리보기를 제공한다.

## 현재 구현 경계

`교사 가입·로그인 → 방 생성 → 수업일 생성 → 학생 코드 입장 → 교사 승인 → 일일 3항목 평가 → 학생 자기관찰 → 등급 카드 → 상점 편집·구매·승인·진척 리포트 → 카드 아트 업로드`까지 연결되어 있다. 다음 구현 단위는 잔액 원자 RPC, 조커 원장, 차트·PWA다.
