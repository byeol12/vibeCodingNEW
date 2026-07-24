import type { CardGrade } from "./contracts";

type Session = {
  id: string;
  session_date: string;
};

type Evaluation = {
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

export function deriveProgress(
  sessions: Session[],
  evaluations: Evaluation[],
  reflections: Reflection[],
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
  let totalPoints = 0;

  sessions
    .slice()
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
    .forEach((session) => {
      const evaluation = evaluationMap.get(session.id);
      const count = evaluationCount(evaluation);
      let grade: CardGrade | null = null;

      if (evaluation?.joker_used) {
        streak += 1;
        grade = "J";
      } else if (count === 3) {
        streak += 1;
        if (evaluation?.is_lucky || streak >= 10) grade = "L";
        else if (streak >= 5) grade = "E";
        else grade = "R";
      } else {
        if (count === 1) grade = "C";
        if (count === 2) grade = "U";
        streak = 0;
      }

      const reflection = reflectionMap.get(session.id);
      const points =
        count +
        (count === 3 ? 2 : 0) +
        (reflection?.praise_tags.length ? 2 : 0) +
        (count === 3 && evaluation?.is_lucky ? 5 : 0);

      gradeAt[session.id] = grade;
      pointsAt[session.id] = points;
      streakAt[session.id] = streak;
      totalPoints += points;
      bestStreak = Math.max(bestStreak, streak);
    });

  return {
    gradeAt,
    pointsAt,
    streakAt,
    currentStreak: streak,
    bestStreak,
    totalPoints,
  };
}
