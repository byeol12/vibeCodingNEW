import { AppShell } from "@/components/app-shell";
import { RewardCard, type HoloRarity } from "@/components/reward-card";

/**
 * Sequential holo tiers like https://poke-holo.simey.me/
 * Game grades map to a subset; lab shows the full ladder.
 */
const samples: {
  holo: HoloRarity;
  title: string;
  blurb: string;
  grade: "C" | "U" | "R" | "E" | "L" | "J";
  points: number;
  streak: number;
  attitude: boolean;
  participation: boolean;
  homework: boolean;
  isLucky?: boolean;
  jokerUsed?: boolean;
  praiseTags: string[];
  teacherMemo: string;
  gameMap?: string;
}[] = [
  {
    holo: "basic",
    title: "1. Basic glare",
    blurb: "커먼 · 커서 따라가는 flare만",
    grade: "C",
    points: 1,
    streak: 1,
    attitude: true,
    participation: false,
    homework: false,
    praiseTags: ["greet"],
    teacherMemo: "시작이 좋아요.",
    gameMap: "게임 등급 C",
  },
  {
    holo: "reverse-holo",
    title: "2. Reverse Holo",
    blurb: "언커먼 · foil + soft-light / difference",
    grade: "U",
    points: 2,
    streak: 2,
    attitude: true,
    participation: true,
    homework: false,
    praiseTags: ["note", "focus"],
    teacherMemo: "필기가 꼼꼼했어요.",
    gameMap: "게임 등급 U",
  },
  {
    holo: "rare-holo",
    title: "3. Holofoil Rare",
    blurb: "레어 · rainbow beam + scanlines",
    grade: "R",
    points: 5,
    streak: 4,
    attitude: true,
    participation: true,
    homework: true,
    praiseTags: ["hand", "ask", "help"],
    teacherMemo: "오늘 발표가 멋졌어요!",
    gameMap: "게임 등급 R",
  },
  {
    holo: "cosmos",
    title: "4. Cosmos / Galaxy",
    blurb: "에픽 · galaxy speckles + prism bars",
    grade: "E",
    points: 7,
    streak: 6,
    attitude: true,
    participation: true,
    homework: true,
    praiseTags: ["grit", "retry", "prep"],
    teacherMemo: "집중력이 한 단계 올라갔어요.",
    gameMap: "게임 등급 E",
  },
  {
    holo: "radiant",
    title: "5. Radiant",
    blurb: "교차 격자 bars · 전체 프레임",
    grade: "E",
    points: 8,
    streak: 7,
    attitude: true,
    participation: true,
    homework: true,
    praiseTags: ["focus", "grit"],
    teacherMemo: "빛이 교차해요.",
  },
  {
    holo: "v",
    title: "6. V diagonal",
    blurb: "대각선 metallic · 반대 방향 travel",
    grade: "L",
    points: 9,
    streak: 8,
    attitude: true,
    participation: true,
    homework: true,
    praiseTags: ["hand", "help", "prep"],
    teacherMemo: "메탈릭 대각선.",
  },
  {
    holo: "rainbow",
    title: "7. Rainbow Rare",
    blurb: "레전더리 · pastel + glitter",
    grade: "L",
    points: 12,
    streak: 10,
    attitude: true,
    participation: true,
    homework: true,
    isLucky: true,
    praiseTags: ["focus", "time", "help"],
    teacherMemo: "레전더리 하루!",
    gameMap: "게임 등급 L",
  },
  {
    holo: "secret-gold",
    title: "8. Secret Rare (Gold)",
    blurb: "골드 글리터 · 반대 방향 slide",
    grade: "L",
    points: 15,
    streak: 12,
    attitude: true,
    participation: true,
    homework: true,
    isLucky: true,
    praiseTags: ["grit", "retry", "focus"],
    teacherMemo: "시크릿 골드!",
  },
  {
    holo: "shiny",
    title: "9. Shiny Vault",
    blurb: "조커 · sunpillar + silver foil bars",
    grade: "J",
    points: 5,
    streak: 3,
    attitude: true,
    participation: false,
    homework: false,
    jokerUsed: true,
    praiseTags: ["grit"],
    teacherMemo: "조커로 이어 갔어요.",
    gameMap: "게임 등급 J",
  },
];

export default function CardLabPage() {
  return (
    <AppShell
      eyebrow="Dev lab"
      title="Holo 단계 미리보기"
      description="poke-holo.simey.me 순서처럼 basic → reverse → rare → cosmos → radiant → V → rainbow → gold → shiny"
    >
      <p className="form-help">
        포일은 호버할 때만 나타납니다 (<code>--card-opacity</code>). 주소:{" "}
        <code>/dev/cards</code>
      </p>
      <div className="card-lab-grid">
        {samples.map((sample, index) => (
          <div key={sample.holo} className="card-lab-item">
            <p className="card-lab-item__label">{sample.title}</p>
            <p className="card-lab-item__blurb">{sample.blurb}</p>
            {sample.gameMap && (
              <p className="card-lab-item__map">{sample.gameMap}</p>
            )}
            <RewardCard
              sessionDate={`2026-07-${String(10 + index).padStart(2, "0")}`}
              grade={sample.grade}
              holo={sample.holo}
              points={sample.points}
              streak={sample.streak}
              attitude={sample.attitude}
              participation={sample.participation}
              homework={sample.homework}
              isLucky={sample.isLucky}
              jokerUsed={sample.jokerUsed}
              teacherMemo={sample.teacherMemo}
              praiseTags={sample.praiseTags}
              studentName="미리보기"
              cardIndex={index + 1}
              totalDays={samples.length}
            />
          </div>
        ))}
      </div>
    </AppShell>
  );
}
