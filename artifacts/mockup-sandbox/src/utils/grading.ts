export function parseMMSS(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^(mu|med|abs|exc)/i.test(s)) return null;
  if (s.includes(":")) {
    const [mp, sp] = s.split(":");
    const m = parseInt(mp, 10), sec = parseInt(sp, 10);
    if (!isNaN(m) && !isNaN(sec) && sec >= 0 && sec < 60) return m * 60 + sec;
  }
  if (s.includes(".")) {
    const [mp, dp] = s.split(".");
    const m = parseInt(mp, 10);
    const secStr = dp.length === 1 ? dp + "0" : dp.slice(0, 2);
    const sec = parseInt(secStr, 10);
    if (!isNaN(m) && !isNaN(sec) && sec >= 0 && sec < 60) return m * 60 + sec;
  }
  const n = parseInt(s, 10);
  if (!isNaN(n) && String(n) === s) return n * 60;
  return null;
}

export type GradingConfig = {
  tier90MaxSecs: number;
  tier80MaxSecs: number;
  threshold65Secs: number;
  threshold50Secs: number;
  specialLabels: {
    mu: string;
    med: string;
    abs: string;
    exc: string;
  };
};

export const DEFAULT_GRADING_CONFIG: GradingConfig = {
  tier90MaxSecs: 10,
  tier80MaxSecs: 29,
  threshold65Secs: 720,
  threshold50Secs: 960,
  specialLabels: {
    mu: "Make-Up",
    med: "Medical",
    abs: "Absent",
    exc: "Excused",
  },
};

export type SpecialStatus = {
  label: string;
  title: string;
  bgClass: string;
  fgClass: string;
};

export const SPECIAL_BASE: Record<string, Omit<SpecialStatus, "title">> = {
  mu:  { label: "MU",  bgClass: "bg-yellow-100 dark:bg-yellow-900",  fgClass: "text-yellow-800 dark:text-yellow-200"  },
  med: { label: "MED", bgClass: "bg-green-50 dark:bg-green-900",     fgClass: "text-green-700 dark:text-green-200"    },
  abs: { label: "ABS", bgClass: "bg-slate-100 dark:bg-slate-700",    fgClass: "text-slate-600 dark:text-slate-300"    },
  exc: { label: "EXC", bgClass: "bg-purple-50 dark:bg-purple-900",   fgClass: "text-purple-700 dark:text-purple-200"  },
};

export function buildSpecial(cfg: GradingConfig): Record<string, SpecialStatus> {
  return {
    mu:  { ...SPECIAL_BASE.mu,  title: cfg.specialLabels.mu  },
    med: { ...SPECIAL_BASE.med, title: cfg.specialLabels.med },
    abs: { ...SPECIAL_BASE.abs, title: cfg.specialLabels.abs },
    exc: { ...SPECIAL_BASE.exc, title: cfg.specialLabels.exc },
  };
}

export function getSpecial(
  raw: string | null | undefined,
  cfg: GradingConfig = DEFAULT_GRADING_CONFIG,
): SpecialStatus | null {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  const special = buildSpecial(cfg);
  for (const [key, val] of Object.entries(special)) {
    if (s.startsWith(key)) return val;
  }
  return null;
}

export function calcScore(
  mileRaw: string,
  ttbRaw: string,
  cfg: GradingConfig = DEFAULT_GRADING_CONFIG,
): number | null {
  if (getSpecial(mileRaw, cfg)) return null;
  const mt = parseMMSS(mileRaw);
  if (mt === null) return null;
  if (mt >= cfg.threshold50Secs) return 50;
  if (mt >= cfg.threshold65Secs) return 65;
  const ttb = parseMMSS(ttbRaw);
  if (ttb !== null) {
    if (mt <= ttb) return 100;
    const diff = mt - ttb;
    if (diff <= cfg.tier90MaxSecs) return 90;
    if (diff <= cfg.tier80MaxSecs) return 80;
    return 70;
  }
  return 50;
}

export type ScoreConfig = {
  bgClass: string;
  fgClass: string;
  barClass: string;
  label: string;
};

export const SCORE_CFG: Record<number, ScoreConfig> = {
  100: { bgClass: "bg-green-100 dark:bg-green-900",  fgClass: "text-green-800 dark:text-green-200",  barClass: "bg-green-500",  label: "Beat TTB"        },
  90:  { bgClass: "bg-blue-100 dark:bg-blue-900",   fgClass: "text-blue-800 dark:text-blue-200",   barClass: "bg-blue-500",   label: "≤ 0:10 above"    },
  80:  { bgClass: "bg-sky-100 dark:bg-sky-900",     fgClass: "text-sky-800 dark:text-sky-200",     barClass: "bg-sky-500",    label: "≤ 0:29 above"    },
  70:  { bgClass: "bg-yellow-100 dark:bg-yellow-900", fgClass: "text-yellow-800 dark:text-yellow-200", barClass: "bg-yellow-500", label: "0:30+ above TTB" },
  65:  { bgClass: "bg-orange-100 dark:bg-orange-900", fgClass: "text-orange-800 dark:text-orange-200", barClass: "bg-orange-500", label: "12:00–15:59"    },
  50:  { bgClass: "bg-red-100 dark:bg-red-900",     fgClass: "text-red-800 dark:text-red-200",     barClass: "bg-red-500",    label: "≥ 16:00 / other" },
};

export function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function normalizeKey(k: string): string {
  return String(k).toLowerCase().replace(/[\s_\-.]/g, "");
}

export function getField(obj: Record<string, string>, ...aliases: string[]): string {
  const norm: Record<string, string> = {};
  for (const k of Object.keys(obj)) norm[normalizeKey(k)] = obj[k];
  for (const alias of aliases) {
    const v = norm[normalizeKey(alias)];
    if (v !== undefined && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}
