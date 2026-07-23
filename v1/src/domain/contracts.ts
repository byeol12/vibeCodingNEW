export const CARD_GRADES = ["C", "U", "R", "E", "L", "J"] as const;
export type CardGrade = (typeof CARD_GRADES)[number];

export const POINT_RULES = {
  check: 1,
  stamp: 2,
  praise: 2,
  lucky: 5,
  growth: 20,
  recovery: 10,
} as const;

export const PRAISE_TAGS = [
  "hand",
  "ask",
  "note",
  "time",
  "retry",
  "help",
  "focus",
  "grit",
  "prep",
  "greet",
] as const;

export const STRUGGLE_TAGS = [
  "sleepy",
  "phone",
  "focus",
  "hard",
  "lost",
] as const;

export type EvaluationInput = {
  attitude: boolean;
  participation: boolean;
  homework: boolean;
  isLucky: boolean;
  jokerUsed: boolean;
};

export type ReflectionInput = {
  praiseTags: (typeof PRAISE_TAGS)[number][];
  struggleTags: (typeof STRUGGLE_TAGS)[number][];
};

export type CardRenderData = {
  date: string;
  grade: CardGrade;
  studentName: string;
  evaluation: EvaluationInput;
  reflection: ReflectionInput;
  streak: number;
  points: number;
  artUrl?: string;
};
