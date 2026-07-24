import type { CardGrade } from "./contracts";
import { POINT_RULES } from "./contracts";

export type Session = {
  id: string;
  session_date: string;
};

export type Evaluation = {
  session_id: string;
  attitude: boolean;
  participation: boolean;
  homework: boolean;
  is_lucky: boolean;
  joker_used: boolean;
};

type Reflection = {
  session_id: string;
  praise_tags: string[];
};

export function evaluationCount(evaluation?: Evaluation | null) {
  if (!evaluation) return 0;
  return (
    Number(evaluation.attitude) +
    Number(evaluation.participation) +
    Number(evaluation.homework)
  );
}

function isDone(evaluation?: Evaluation | null) {
  if (!evaluation) return false;
  return (
    evaluation.joker_used ||
    (evaluation.attitude &&
      evaluation.participation &&
      evaluation.homework)
  );
}

function monthKey(sessionDate: string) {
  return sessionDate.slice(0, 7);
}

export function growthBonusCount(
  sessions: Session[],
  evaluations: Evaluation[],
) {
  const evaluationMap = new Map(
    evaluations.map((evaluation) => [evaluation.session_id, evaluation]),
  );
  const months = [
    ...new Set(
      sessions
        .slice()
        .sort((a, b) => a.session_date.localeCompare(b.session_date))
        .map((session) => monthKey(session.session_date)),
    ),
  ];

  let count = 0;
  for (let index = 1; index < months.length; index += 1) {
    const previous = monthProgress(sessions, evaluationMap, months[index - 1]);
    const current = monthProgress(sessions, evaluationMap, months[index]);
    if (
      previous.touched &&
      current.touched &&
      current.total > 0 &&
      previous.total > 0 &&
      current.done / current.total > previous.done / previous.total
    ) {
      count += 1;
    }
  }
  return count;
}

function monthProgress(
  sessions: Session[],
  evaluationMap: Map<string, Evaluation>,
  key: string,
) {
  const monthSessions = sessions.filter(
    (session) => monthKey(session.session_date) === key,
  );
  let done = 0;
  let touched = false;
  for (const session of monthSessions) {
    const evaluation = evaluationMap.get(session.id);
    if (!evaluation) continue;
    const count = evaluationCount(evaluation);
    if (count > 0 || evaluation.joker_used) touched = true;
    if (isDone(evaluation)) done += 1;
  }
  return { touched, done, total: monthSessions.length };
}

export function deriveProgress(
  sessions: Session[],
  evaluations: Evaluation[],
  reflections: Reflection[],
  bonusPoints = 0,
) {
  const evaluationMap = new Map(
    evaluations.map((evaluation) => [evaluation.session_id, evaluation]),
  );
  const reflectionMap = new Map(
    reflections.map((reflection) => [reflection.session_id, reflection]),
  );
  const gradeAt: Record<string, CardGrade | null> = {};
  const pointsAt: Record<string, number> = {};
  const streakAt: Record<string, number> = {};
  let streak = 0;
  let bestStreak = 0;
  let dailyPoints = 0;
  let latestBreakSessionId: string | null = null;
  let recoveryProgress = 0;

  sessions
    .slice()
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
    .forEach((session) => {
      const evaluation = evaluationMap.get(session.id);
      const count = evaluationCount(evaluation);
      let grade: CardGrade | null = null;

      // v0: 아무 기록이 없는 날은 스트릭을 끊지 않는다.
      if (!evaluation || (count === 0 && !evaluation.joker_used)) {
        gradeAt[session.id] = null;
        pointsAt[session.id] = 0;
        streakAt[session.id] = streak;
        return;
      }

      if (evaluation.joker_used) {
        streak += 1;
        grade = "J";
        if (latestBreakSessionId) recoveryProgress += 1;
      } else if (count === 3) {
        streak += 1;
        if (evaluation.is_lucky || streak >= 10) grade = "L";
        else if (streak >= 5) grade = "E";
        else grade = "R";
        if (latestBreakSessionId) recoveryProgress += 1;
      } else {
        grade = count === 1 ? "C" : "U";
        if (streak > 0) {
          latestBreakSessionId = session.id;
          recoveryProgress = 0;
        }
        streak = 0;
      }

      const reflection = reflectionMap.get(session.id);
      const points =
        count +
        (count === 3 ? 2 : 0) +
        (reflection?.praise_tags.length ? 2 : 0) +
        (count === 3 && evaluation.is_lucky ? 5 : 0);

      gradeAt[session.id] = grade;
      pointsAt[session.id] = points;
      streakAt[session.id] = streak;
      dailyPoints += points;
      bestStreak = Math.max(bestStreak, streak);
    });

  const growthCount = growthBonusCount(sessions, evaluations);

  return {
    gradeAt,
    pointsAt,
    streakAt,
    currentStreak: streak,
    bestStreak,
    dailyPoints,
    bonusPoints,
    growthCount,
    totalPoints: dailyPoints + bonusPoints,
    recovery: latestBreakSessionId
      ? {
          breakSessionId: latestBreakSessionId,
          progress: recoveryProgress,
        }
      : null,
    potentialGrowthPoints: growthCount * POINT_RULES.growth,
  };
}
