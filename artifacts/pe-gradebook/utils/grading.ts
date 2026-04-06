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

export type SpecialStatus = {
  label: string;
  title: string;
  bgKey: string;
  fgKey: string;
};

export const SPECIAL: Record<string, SpecialStatus> = {
  mu:  { label: "MU",  title: "Make-Up",  bgKey: "muBg",  fgKey: "muFg"  },
  med: { label: "MED", title: "Medical",  bgKey: "medBg", fgKey: "medFg" },
  abs: { label: "ABS", title: "Absent",   bgKey: "absBg", fgKey: "absFg" },
  exc: { label: "EXC", title: "Excused",  bgKey: "excBg", fgKey: "excFg" },
};

export function getSpecial(raw: string | null | undefined): SpecialStatus | null {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  for (const [key, val] of Object.entries(SPECIAL)) {
    if (s.startsWith(key)) return val;
  }
  return null;
}

export function calcScore(mileRaw: string, ttbRaw: string): number | null {
  if (getSpecial(mileRaw)) return null;
  const mt = parseMMSS(mileRaw);
  if (mt === null) return null;
  if (mt >= 960) return 50;
  if (mt >= 720) return 65;
  const ttb = parseMMSS(ttbRaw);
  if (ttb !== null) {
    if (mt <= ttb) return 100;
    const diff = mt - ttb;
    if (diff <= 10) return 90;
    if (diff <= 29) return 80;
    return 70;
  }
  return 50;
}

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
