/** Monday (ISO date) of the calendar week containing `isoDate` (YYYY-MM-DD). */
export function weekStartMonday(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const dow = new Date(utc).getUTCDay(); // 0 = Sun … 6 = Sat
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(utc);
  monday.setUTCDate(monday.getUTCDate() + offsetToMonday);
  return monday.toISOString().slice(0, 10);
}

export const WEEKLY_HELPFUL_FACTORS = [
  ["sleep", "😴 충분한 잠"],
  ["planning", "📝 계획 세우기"],
  ["teacher", "🙋 선생님 도움"],
  ["phone-away", "📵 폰 멀리 두기"],
] as const;

export type WeeklyHelpfulFactor =
  (typeof WEEKLY_HELPFUL_FACTORS)[number][0];

export function isWeeklyHelpfulFactor(
  value: string,
): value is WeeklyHelpfulFactor {
  return WEEKLY_HELPFUL_FACTORS.some(([id]) => id === value);
}
