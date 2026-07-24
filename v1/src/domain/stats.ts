import { weekStartMonday } from "@/domain/weekly";
import { evaluationCount, type Evaluation, type Session } from "@/domain/progress";

export type TagCount = { key: string; label: string; count: number };

export function countPerfectWeeks(
  sessions: Session[],
  evaluations: Evaluation[],
) {
  const evaluationMap = new Map(
    evaluations.map((evaluation) => [evaluation.session_id, evaluation]),
  );
  const byWeek = new Map<string, Session[]>();

  for (const session of sessions) {
    const key = weekStartMonday(session.session_date);
    const bucket = byWeek.get(key) || [];
    bucket.push(session);
    byWeek.set(key, bucket);
  }

  let count = 0;
  for (const weekSessions of byWeek.values()) {
    if (weekSessions.length === 0) continue;
    const allStamped = weekSessions.every((session) => {
      const evaluation = evaluationMap.get(session.id);
      return Boolean(
        evaluation &&
          (evaluationCount(evaluation) === 3 || evaluation.joker_used),
      );
    });
    if (allStamped) count += 1;
  }
  return count;
}

export function weeklyCompletionSeries(
  sessions: Session[],
  evaluations: Evaluation[],
  limit = 8,
) {
  const evaluationMap = new Map(
    evaluations.map((evaluation) => [evaluation.session_id, evaluation]),
  );
  const byWeek = new Map<
    string,
    { done: number; total: number; label: string }
  >();

  for (const session of sessions) {
    const key = weekStartMonday(session.session_date);
    const entry = byWeek.get(key) || {
      done: 0,
      total: 0,
      label: key.slice(5),
    };
    entry.total += 1;
    const evaluation = evaluationMap.get(session.id);
    if (evaluation && (evaluationCount(evaluation) > 0 || evaluation.joker_used)) {
      entry.done += 1;
    }
    byWeek.set(key, entry);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([key, value]) => ({
      key,
      label: value.label,
      rate: value.total ? Math.round((value.done / value.total) * 100) : 0,
      done: value.done,
      total: value.total,
    }));
}

export function tallyTags(
  rows: Array<{ tags: string[] }>,
  catalog: ReadonlyArray<readonly [string, string]>,
): TagCount[] {
  const counts = new Map<string, number>();
  for (const [key] of catalog) counts.set(key, 0);
  for (const row of rows) {
    for (const tag of row.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return catalog
    .map(([key, label]) => ({
      key,
      label,
      count: counts.get(key) || 0,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}
