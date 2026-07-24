import { CardTilt } from "@/components/card-tilt";

const gradeNames = {
  C: "커먼",
  U: "언커먼",
  R: "레어",
  E: "에픽",
  L: "레전더리",
  J: "조커",
} as const;

const holoRarity = {
  C: "basic",
  U: "reverse-holo",
  R: "rare-holo",
  E: "cosmos",
  L: "rainbow",
  J: "shiny",
} as const;

export type HoloRarity =
  | "basic"
  | "reverse-holo"
  | "rare-holo"
  | "cosmos"
  | "radiant"
  | "v"
  | "rainbow"
  | "secret-gold"
  | "shiny";

const glareHueByGrade = {
  C: 250,
  U: 145,
  R: 175,
  E: 280,
  L: 42,
  J: 330,
} as const;

const rarityMarks = {
  C: "●",
  U: "◆",
  R: "★",
  E: "★★",
  L: "★★★",
  J: "🃏",
} as const;

const checkRows = [
  { key: "attitude", name: "태도", icon: "😊", tone: "attitude" },
  { key: "participation", name: "참여", icon: "📖", tone: "sincere" },
  { key: "homework", name: "숙제", icon: "✏️", tone: "homework" },
] as const;

const praiseLabels: Record<string, string> = {
  hand: "🙋 먼저 손 들고 발표",
  ask: "🧠 모르는 걸 질문",
  note: "✍️ 필기를 꼼꼼히",
  time: "⏰ 제시간에 도착",
  retry: "🔁 틀린 문제 다시 풀기",
  help: "🤝 친구를 도와줌",
  focus: "🎯 끝까지 집중",
  grit: "💪 포기하지 않음",
  prep: "📚 예습·복습 완료",
  greet: "😊 밝게 인사",
};

type Grade = keyof typeof gradeNames;

type RewardCardProps = {
  sessionDate: string;
  grade: Grade | null;
  points: number;
  streak: number;
  attitude: boolean;
  participation: boolean;
  homework: boolean;
  isLucky?: boolean;
  jokerUsed?: boolean;
  teacherMemo?: string | null;
  praiseTags?: string[];
  studentName?: string;
  cardIndex?: number;
  totalDays?: number;
  /** Override holo tier for lab / previews (defaults from grade). */
  holo?: HoloRarity;
};

function weekdayLabel(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function formatCardDate(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export function RewardCard({
  sessionDate,
  grade,
  points,
  streak,
  attitude,
  participation,
  homework,
  isLucky = false,
  jokerUsed = false,
  teacherMemo,
  praiseTags = [],
  studentName,
  cardIndex,
  totalDays,
  holo,
}: RewardCardProps) {
  const resolvedGrade = grade || "C";
  const rarity = holo || holoRarity[resolvedGrade];
  const checks = { attitude, participation, homework };
  const stamped = attitude && participation && homework;
  const stampMark =
    stamped || jokerUsed
      ? resolvedGrade === "J" || jokerUsed
        ? "🃏"
        : "⭐"
      : "—";
  const artEmoji =
    resolvedGrade === "J" || jokerUsed ? "🃏" : isLucky ? "🍀" : stamped ? "⭐" : "✨";
  const praiseItems = praiseTags
    .map((tag) => praiseLabels[tag] || tag)
    .slice(0, 3);

  return (
    <CardTilt
      className="reward-card-tilt"
      glareHue={glareHueByGrade[resolvedGrade]}
    >
      <article
        className={`reward-card reward-card--${resolvedGrade}`}
        data-rarity={rarity}
      >
        <div className="reward-card__inner">
          <header className="reward-card__top">
            <span className="reward-card__badge">{gradeNames[resolvedGrade]}</span>
            <div className="reward-card__points">
              <span>POINT</span>
              <strong>+{points}</strong>
            </div>
          </header>

          <div className="reward-card__title-row">
            <strong className="reward-card__date">{formatCardDate(sessionDate)}</strong>
            <span className="reward-card__weekday">{weekdayLabel(sessionDate)}</span>
            <div className="reward-card__meta" aria-label="카드 지표">
              <span className="reward-card__meta-item">
                <span className="reward-card__meta-label">연속</span>
                <strong>🔥{streak}</strong>
              </span>
              <span className="reward-card__meta-item">
                <span className="reward-card__meta-label">도장</span>
                <strong aria-hidden="true">{stampMark}</strong>
              </span>
              <span className="reward-card__meta-item reward-card__meta-item--rarity">
                <span className="reward-card__meta-label">레어도</span>
                <strong className="reward-card__rarity">
                  {rarityMarks[resolvedGrade]}
                </strong>
              </span>
            </div>
          </div>

          <div className="reward-card__art">
            <div className="reward-card__shine" aria-hidden="true" />
            <div className="reward-card__glare" aria-hidden="true" />
            {isLucky && (
              <span className="reward-card__lucky">LUCKY STAMP  +5P</span>
            )}
            <span className="reward-card__art-emoji" aria-hidden="true">
              {artEmoji}
            </span>
          </div>

          <ul className="reward-card__checks">
            {checkRows.map((row) => {
              const on = checks[row.key];
              return (
                <li
                  key={row.key}
                  className={`reward-card__check reward-card__check--${row.tone}${on ? " is-on" : ""}`}
                >
                  <span className="reward-card__orb" aria-hidden="true">
                    {on ? row.icon : "·"}
                  </span>
                  <span className="reward-card__check-name">{row.name}</span>
                </li>
              );
            })}
            {jokerUsed && (
              <li className="reward-card__check reward-card__check--joker is-on">
                <span className="reward-card__orb" aria-hidden="true">
                  🃏
                </span>
                <span className="reward-card__check-name">조커</span>
              </li>
            )}
          </ul>

          <section className="reward-card__ability">
            <div className="reward-card__ability-head">
              <span className="reward-card__ability-label">칭찬</span>
              <strong>
                {praiseItems.length
                  ? "오늘 내가 잘한 것"
                  : "칭찬 태그를 골라봐요"}
              </strong>
            </div>
            {praiseItems.length > 0 && (
              <ul className="reward-card__tags">
                {praiseItems.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            )}
          </section>

          {teacherMemo && (
            <blockquote className="reward-card__memo">
              “{teacherMemo}”
              <cite>선생님 한마디</cite>
            </blockquote>
          )}

          <div className="reward-card__footer">
            <span>illus. {studentName || "도장 챌린지"}</span>
            {typeof cardIndex === "number" && typeof totalDays === "number" && (
              <span>
                #{String(cardIndex).padStart(3, "0")} / {totalDays}
              </span>
            )}
          </div>
        </div>
      </article>
    </CardTilt>
  );
}
