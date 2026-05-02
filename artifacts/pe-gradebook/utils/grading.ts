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

// ── Grading configuration ──────────────────────────────────────────────────

export type GradingConfig = {
  // How many seconds over TTB still earns each tier
  tier90MaxSecs: number;  // default 10  → "within 10 sec of TTB"
  tier80MaxSecs: number;  // default 29  → "within 29 sec of TTB"
  // Absolute time cutoffs (in seconds) — override TTB tiers
  threshold65Secs: number; // default 720  (12:00)
  threshold50Secs: number; // default 960  (16:00)
  // Custom labels for special status codes
  specialLabels: {
    mu: string;   // default "Make-Up"
    med: string;  // default "Medical"
    abs: string;  // default "Absent"
    exc: string;  // default "Excused"
  };
};

export const DEFAULT_GRADING_CONFIG: GradingConfig = {
  tier90MaxSecs: 10,
  tier80MaxSecs: 29,
  threshold65Secs: 720,
  threshold50Secs: 960,
  specialLabels: {
    mu:  "Make-Up",
    med: "Medical",
    abs: "Absent",
    exc: "Excused",
  },
};

// ── Special status ─────────────────────────────────────────────────────────

export type SpecialStatus = {
  label: string;
  title: string;
  bgKey: string;
  fgKey: string;
};

// Static code definitions — titles are overridden at runtime from config
export const SPECIAL_BASE: Record<string, Omit<SpecialStatus, "title">> = {
  mu:  { label: "MU",  bgKey: "muBg",  fgKey: "muFg"  },
  med: { label: "MED", bgKey: "medBg", fgKey: "medFg" },
  abs: { label: "ABS", bgKey: "absBg", fgKey: "absFg" },
  exc: { label: "EXC", bgKey: "excBg", fgKey: "excFg" },
};

// Default SPECIAL map (used where no config is available)
export const SPECIAL: Record<string, SpecialStatus> = {
  mu:  { ...SPECIAL_BASE.mu,  title: DEFAULT_GRADING_CONFIG.specialLabels.mu  },
  med: { ...SPECIAL_BASE.med, title: DEFAULT_GRADING_CONFIG.specialLabels.med },
  abs: { ...SPECIAL_BASE.abs, title: DEFAULT_GRADING_CONFIG.specialLabels.abs },
  exc: { ...SPECIAL_BASE.exc, title: DEFAULT_GRADING_CONFIG.specialLabels.exc },
};

// Build a SPECIAL map from config (for components that have access to config)
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
  cfg: GradingConfig = DEFAULT_GRADING_CONFIG
): SpecialStatus | null {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  const special = buildSpecial(cfg);
  for (const [key, val] of Object.entries(special)) {
    if (s.startsWith(key)) return val;
  }
  return null;
}

// ── Score calculation ──────────────────────────────────────────────────────

export function calcScore(
  mileRaw: string,
  ttbRaw: string,
  cfg: GradingConfig = DEFAULT_GRADING_CONFIG
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

// ── Score display config ───────────────────────────────────────────────────

export type ScoreConfig = {
  bgKey: string;
  fgKey: string;
  barKey: string;
  label: string;
};

export const SCORE_CFG: Record<number, ScoreConfig> = {
  100: { bgKey: "score100bg", fgKey: "score100fg", barKey: "score100bar", label: "Beat TTB"        },
  90:  { bgKey: "score90bg",  fgKey: "score90fg",  barKey: "score90bar",  label: "\u2264 0:10 above"    },
  80:  { bgKey: "score80bg",  fgKey: "score80fg",  barKey: "score80bar",  label: "\u2264 0:29 above"    },
  70:  { bgKey: "score70bg",  fgKey: "score70fg",  barKey: "score70bar",  label: "0:30+ above TTB" },
  65:  { bgKey: "score65bg",  fgKey: "score65fg",  barKey: "score65bar",  label: "12:00\u201315:59"      },
  50:  { bgKey: "score50bg",  fgKey: "score50fg",  barKey: "score50bar",  label: "\u2265 16:00 / other" },
};

// ── Personal best ──────────────────────────────────────────────────────────

export type BestTimeResult = {
  time: string;       // formatted MM:SS string
  secs: number;       // raw seconds (for comparison)
  label: string;      // "Current" or the run date label
  isCurrent: boolean; // true if the best time is the live mileTime field
};

export function getBestMileTime(
  row: { mileTime: string; runs: { mileTime: string; label: string }[] }
): BestTimeResult | null {
  const candidates: { time: string; secs: number; label: string; isCurrent: boolean }[] = [];

  const curSecs = parseMMSS(row.mileTime);
  if (curSecs !== null) {
    candidates.push({ time: row.mileTime, secs: curSecs, label: "Current", isCurrent: true });
  }

  for (const run of row.runs) {
    const s = parseMMSS(run.mileTime);
    if (s !== null) {
      candidates.push({ time: run.mileTime, secs: s, label: run.label, isCurrent: false });
    }
  }

  if (!candidates.length) return null;
  return candidates.reduce((best, c) => (c.secs < best.secs ? c : best));
}

// ── Utilities ──────────────────────────────────────────────────────────────

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
