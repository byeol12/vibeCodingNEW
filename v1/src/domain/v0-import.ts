import { CARD_GRADES, type CardGrade } from "./contracts";

export type V0Record = {
  attitude?: boolean;
  participation?: boolean;
  homework?: boolean;
  praise?: string[];
  struggle?: string[];
  memo?: string;
  jokerUsed?: boolean;
  isLucky?: boolean;
};

export type V0Purchase = {
  id?: string;
  itemId?: string;
  name?: string;
  icon?: string;
  price?: number;
  status?: string;
  ts?: number;
};

export type V0ShopItem = {
  id?: string;
  icon?: string;
  name?: string;
  desc?: string;
  price?: number;
  needsApproval?: boolean;
  limitMonth?: number | null;
  limitSeason?: number | null;
  effect?: string;
  frameId?: string;
};

export type V0State = {
  version?: number;
  student?: { name?: string; className?: string };
  program?: { start?: string; end?: string; weekdays?: number[] };
  records?: Record<string, V0Record>;
  jokers?: { available?: number; homeworkAwards?: string[] };
  perfectWeeks?: Record<string, boolean>;
  purchases?: V0Purchase[];
  shopItems?: V0ShopItem[];
  cardArt?: Partial<Record<CardGrade, string>>;
  reflections?: Record<string, string>;
  recoveryAwards?: Record<string, boolean>;
  bonusPoints?: number;
};

export type V0ImportPreview = {
  version: number;
  studentName: string;
  className: string;
  programStart: string | null;
  programEnd: string | null;
  weekdays: number[];
  recordDates: string[];
  evaluationCount: number;
  reflectionCount: number;
  jokerUsedCount: number;
  homeworkAwardCount: number;
  perfectWeekCount: number;
  shopItemCount: number;
  purchaseCount: number;
  cardArtGrades: CardGrade[];
  recoveryAwardCount: number;
  bonusPoints: number;
  weeklyReflectionCount: number;
  skippedWeeklyReflectionCount: number;
  skippedFrameShopItems: number;
  warnings: string[];
};

export type WeeklyHelpfulFactor =
  | "sleep"
  | "planning"
  | "teacher"
  | "phone-away";

const weeklyFactorMap: Record<string, WeeklyHelpfulFactor> = {
  sleep: "sleep",
  plan: "planning",
  planning: "planning",
  teacher: "teacher",
  phone_away: "phone-away",
  "phone-away": "phone-away",
};

export function mapWeeklyHelpfulFactor(
  value: string,
): WeeklyHelpfulFactor | null {
  return weeklyFactorMap[value] || null;
}

/** v0 week key: `YYYY-MM-DD` or `M:YYYY-MM-DD` → calendar Monday */
export function weekStartFromV0Key(key: string): string | null {
  const raw = key.includes(":") ? key.slice(key.indexOf(":") + 1) : key;
  return isIsoDate(raw) ? raw : null;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseV0State(raw: unknown): {
  state: V0State;
  preview: V0ImportPreview;
} {
  const root = asRecord(raw);
  if (!root) throw new Error("JSON 객체가 필요합니다.");

  const version = Number(root.version || 0);
  if (version < 8 || version > 9) {
    throw new Error("지원 버전은 stampChallenge v8~v9 JSON입니다.");
  }

  const student = asRecord(root.student) || {};
  const program = asRecord(root.program) || {};
  const records = asRecord(root.records) || {};
  const jokers = asRecord(root.jokers) || {};
  const perfectWeeks = asRecord(root.perfectWeeks) || {};
  const recoveryAwards = asRecord(root.recoveryAwards) || {};
  const cardArt = asRecord(root.cardArt) || {};
  const weeklyReflections = asRecord(root.reflections) || {};
  const purchases = Array.isArray(root.purchases) ? root.purchases : [];
  const shopItems = Array.isArray(root.shopItems) ? root.shopItems : [];

  const warnings: string[] = [];
  const recordDates = Object.keys(records).filter(isIsoDate).sort();
  if (recordDates.length !== Object.keys(records).length) {
    warnings.push("날짜 형식이 아닌 수업 기록은 제외됩니다.");
  }

  let evaluationCount = 0;
  let reflectionCount = 0;
  let jokerUsedCount = 0;
  for (const date of recordDates) {
    const record = asRecord(records[date]) || {};
    const attitude = Boolean(record.attitude);
    const participation = Boolean(record.participation);
    const homework = Boolean(record.homework);
    const jokerUsed = Boolean(record.jokerUsed);
    const praise = Array.isArray(record.praise) ? record.praise.map(String) : [];
    const struggle = Array.isArray(record.struggle)
      ? record.struggle.map(String)
      : [];
    const memo = String(record.memo || "");
    if (attitude || participation || homework || jokerUsed || memo) {
      evaluationCount += 1;
    }
    if (praise.length || struggle.length) reflectionCount += 1;
    if (jokerUsed) jokerUsedCount += 1;
  }

  const importableShop = shopItems.filter((item) => {
    const row = asRecord(item);
    return row && row.effect !== "frame";
  });
  const skippedFrameShopItems = shopItems.length - importableShop.length;
  if (skippedFrameShopItems > 0) {
    warnings.push(`프레임 상점 항목 ${skippedFrameShopItems}개는 v1에서 제외됩니다.`);
  }

  const cardArtGrades = CARD_GRADES.filter((grade) => {
    const value = cardArt[grade];
    return typeof value === "string" && value.startsWith("data:image");
  });

  const homeworkAwards = Array.isArray(jokers.homeworkAwards)
    ? jokers.homeworkAwards.map(String).filter(isIsoDate)
    : [];

  const state: V0State = {
    version,
    student: {
      name: String(student.name || "").trim(),
      className: String(student.className || "").trim(),
    },
    program: {
      start: typeof program.start === "string" ? program.start : undefined,
      end: typeof program.end === "string" ? program.end : undefined,
      weekdays: Array.isArray(program.weekdays)
        ? program.weekdays.map(Number).filter((day) => day >= 0 && day <= 6)
        : [],
    },
    records: Object.fromEntries(
      recordDates.map((date) => {
        const record = asRecord(records[date]) || {};
        return [
          date,
          {
            attitude: Boolean(record.attitude),
            participation: Boolean(record.participation),
            homework: Boolean(record.homework),
            praise: Array.isArray(record.praise)
              ? record.praise.map(String).slice(0, 3)
              : [],
            struggle: Array.isArray(record.struggle)
              ? record.struggle.map(String)
              : [],
            memo: String(record.memo || "").slice(0, 1000),
            jokerUsed: Boolean(record.jokerUsed),
            isLucky: Boolean(record.isLucky),
          } satisfies V0Record,
        ];
      }),
    ),
    jokers: {
      available: Math.max(0, Number(jokers.available) || 0),
      homeworkAwards,
    },
    perfectWeeks: Object.fromEntries(
      Object.entries(perfectWeeks)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => [key, true as const]),
    ),
    purchases: purchases
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        id: String(item.id || ""),
        itemId: String(item.itemId || ""),
        name: String(item.name || ""),
        icon: String(item.icon || "🎁"),
        price: Math.max(0, Number(item.price) || 0),
        status: String(item.status || "pending"),
        ts: Number(item.ts) || Date.now(),
      })),
    shopItems: importableShop
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        id: String(item.id || ""),
        icon: String(item.icon || "🎁").slice(0, 16),
        name: String(item.name || "").slice(0, 80),
        desc: String(item.desc || "").slice(0, 500),
        price: Math.max(0, Number(item.price) || 0),
        needsApproval: item.needsApproval !== false,
        limitMonth:
          item.limitMonth == null ? null : Math.max(1, Number(item.limitMonth) || 1),
        limitSeason:
          item.limitSeason == null
            ? null
            : Math.max(1, Number(item.limitSeason) || 1),
        effect: item.effect === "joker" ? "joker" : undefined,
      })),
    cardArt: Object.fromEntries(
      cardArtGrades.map((grade) => [grade, String(cardArt[grade])]),
    ),
    reflections: Object.fromEntries(
      Object.entries(weeklyReflections).map(([key, value]) => [
        key,
        String(value),
      ]),
    ),
    recoveryAwards: Object.fromEntries(
      Object.entries(recoveryAwards)
        .filter(([key, value]) => isIsoDate(key) && Boolean(value))
        .map(([key]) => [key, true]),
    ),
    bonusPoints: Math.max(0, Number(root.bonusPoints) || 0),
  };

  if (!state.student?.name) {
    warnings.push("JSON에 학생 이름이 없습니다. 가져올 학생을 직접 선택하세요.");
  }

  let weeklyReflectionCount = 0;
  let skippedWeeklyReflectionCount = 0;
  for (const [key, value] of Object.entries(state.reflections || {})) {
    if (!weekStartFromV0Key(key) || !mapWeeklyHelpfulFactor(value)) {
      skippedWeeklyReflectionCount += 1;
      continue;
    }
    weeklyReflectionCount += 1;
  }
  if (skippedWeeklyReflectionCount > 0) {
    warnings.push(
      `주간 성찰 ${skippedWeeklyReflectionCount}건은 값/주차 키가 맞지 않아 제외됩니다.`,
    );
  }

  return {
    state,
    preview: {
      version,
      studentName: state.student?.name || "",
      className: state.student?.className || "",
      programStart: state.program?.start || null,
      programEnd: state.program?.end || null,
      weekdays: state.program?.weekdays || [],
      recordDates,
      evaluationCount,
      reflectionCount,
      jokerUsedCount,
      homeworkAwardCount: homeworkAwards.length,
      perfectWeekCount: Object.keys(state.perfectWeeks || {}).length,
      shopItemCount: state.shopItems?.length || 0,
      purchaseCount: state.purchases?.length || 0,
      cardArtGrades,
      recoveryAwardCount: Object.keys(state.recoveryAwards || {}).length,
      bonusPoints: state.bonusPoints || 0,
      weeklyReflectionCount,
      skippedWeeklyReflectionCount,
      skippedFrameShopItems,
      warnings,
    },
  };
}

export function parseV0JsonText(text: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("JSON 형식이 올바르지 않습니다.");
  }
  return parseV0State(raw);
}
