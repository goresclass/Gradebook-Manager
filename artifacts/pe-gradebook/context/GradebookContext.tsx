import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { calcScore, getField, getSpecial, normalizeKey } from "@/utils/grading";
import { useSettings } from "@/context/SettingsContext";

let _uid = Date.now();
let _classUid = Date.now() + 1000000;
let _runUid = Date.now() + 2000000;

// ── Types ──────────────────────────────────────────────────────────────────

export type RunRecord = {
  id: string;
  label: string;    // human-readable, e.g. "Apr 13, 2026"
  date: string;     // ISO date string
  mileTime: string;
  score: number | null; // score at time of archive
};

export type StudentRow = {
  id: number;
  studentId: string;
  rollCall: string;
  lastName: string;
  firstName: string;
  ttb: string;
  mileTime: string;
  runs: RunRecord[];
  photoUrl: string;
};

export type StudentRowWithScore = StudentRow & {
  _special: ReturnType<typeof getSpecial>;
  score: number | null;
};

export type ClassRecord = {
  id: string;
  name: string;
  rows: StudentRow[];
};

// ── Factories ──────────────────────────────────────────────────────────────

export function mkRow(overrides: Partial<StudentRow> = {}): StudentRow {
  return {
    id: ++_uid,
    studentId: "",
    rollCall: "",
    lastName: "",
    firstName: "",
    ttb: "",
    mileTime: "",
    runs: [],
    photoUrl: "",
    ...overrides,
  };
}

function newClassId(): string { return String(++_classUid); }
function newRunId():   string { return String(++_runUid); }

function makeClass(name: string): ClassRecord {
  return { id: newClassId(), name, rows: [mkRow()] };
}

function csvRowToRow(raw: Record<string, string>): StudentRow {
  return mkRow({
    studentId: getField(raw, "studentid", "student id", "id", "student_id"),
    rollCall:  getField(raw, "rollcall", "roll call", "roll", "number", "#"),
    lastName:  getField(raw, "lastname", "last name", "last", "surname"),
    firstName: getField(raw, "firstname", "first name", "first", "given"),
    ttb:       getField(raw, "timetobeat", "time to beat", "ttb", "goal", "goaltime"),
    mileTime:  getField(raw, "miletime", "mile time", "mile", "time", "runtime"),
    photoUrl:  getField(raw, "photourl", "photo url", "photo", "photo_url", "image", "imageurl", "image_url", "picture", "pic"),
  });
}

function ensureRuns(row: Omit<StudentRow, "runs" | "photoUrl"> & { runs?: RunRecord[]; photoUrl?: string }): StudentRow {
  return { ...row, runs: row.runs ?? [], photoUrl: row.photoUrl ?? "" } as StudentRow;
}

// ── Context type ───────────────────────────────────────────────────────────

type GradebookContextType = {
  // Multi-class management
  classes: ClassRecord[];
  activeClassId: string;
  setActiveClass: (id: string) => void;
  addClass: (name?: string) => string;
  deleteClass: (id: string) => void;
  // Active-class proxies
  rows: StudentRow[];
  ready: boolean;
  className: string;
  setClassName: (name: string) => void;
  updateRow: (id: number, field: keyof StudentRow, val: string) => void;
  addRow: () => void;
  deleteRow: (id: number) => void;
  clearAll: () => void;
  importCSV: (text: string) => { count: number; error?: string };
  importMileTimes: (text: string) => { updated: number; notFound: number; error?: string };
  withScores: StudentRowWithScore[];
  stats: {
    total: number;
    graded: number;
    special: number;
    avg: number | null;
    dist: [number, number][];
  };
  // Run history
  archiveRuns: (label?: string) => number;
  deleteRunRecord: (studentId: number, runId: string) => void;
  updateRunRecord: (studentId: number, runId: string, updates: Partial<Pick<RunRecord, "label" | "mileTime">>) => void;
  renameRunLabel: (oldLabel: string, newLabel: string) => void;
  addRunRecord: (studentId: number, label: string, mileTime: string) => void;
  moveStudentToPeriod: (studentId: number, targetClassId: string) => boolean;
  // Backup / restore
  restoreBackup: (classes: ClassRecord[], activeClassId: string) => void;
};

const GradebookContext = createContext<GradebookContextType | null>(null);

const STORAGE_KEY = "pe_gb_mobile_v1";

// ── Provider ───────────────────────────────────────────────────────────────

export function GradebookProvider({ children }: { children: React.ReactNode }) {
  const { gradingConfig } = useSettings();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [activeClassId, setActiveClassId] = useState<string>("");
  const [ready, setReady] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load & migrate ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);

          // v2 format: { classes: [...], activeClassId: "..." }
          if (parsed.classes && Array.isArray(parsed.classes) && parsed.classes.length > 0) {
            const loadedClasses: ClassRecord[] = parsed.classes.map((c: ClassRecord) => ({
              ...c,
              rows: Array.isArray(c.rows) && c.rows.length > 0
                ? c.rows.map(ensureRuns)
                : [mkRow()],
            }));
            const maxId = Math.max(...loadedClasses.flatMap(c => c.rows.map((r: StudentRow) => r.id || 0)));
            if (maxId > _uid) _uid = maxId;
            setClasses(loadedClasses);
            const activeExists = loadedClasses.some(c => c.id === parsed.activeClassId);
            setActiveClassId(activeExists ? parsed.activeClassId : loadedClasses[0].id);

          // v1 format: { rows: [...], className: "..." }
          } else if (parsed.rows && Array.isArray(parsed.rows)) {
            const migratedRows: StudentRow[] = (parsed.rows.length > 0 ? parsed.rows : [mkRow()]).map(ensureRuns);
            const maxId = Math.max(...migratedRows.map((r: StudentRow) => r.id || 0));
            if (maxId > _uid) _uid = maxId;
            const migrated = makeClass(parsed.className || "Period 1");
            migrated.rows = migratedRows;
            setClasses([migrated]);
            setActiveClassId(migrated.id);

          } else {
            const initial = makeClass("Period 1");
            setClasses([initial]);
            setActiveClassId(initial.id);
          }
        } else {
          const initial = makeClass("Period 1");
          setClasses([initial]);
          setActiveClassId(initial.id);
        }
      } catch {
        const initial = makeClass("Period 1");
        setClasses([initial]);
        setActiveClassId(initial.id);
      }
      setReady(true);
    })();
  }, []);

  // ── Persist ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ classes, activeClassId })).catch(() => {});
    }, 500);
  }, [classes, activeClassId, ready]);

  // ── Active class helpers ─────────────────────────────────────────────────
  const activeClass = classes.find(c => c.id === activeClassId) ?? classes[0];
  const rows = activeClass?.rows ?? [];
  const className = activeClass?.name ?? "";

  const updateActiveClass = useCallback((updater: (c: ClassRecord) => ClassRecord) => {
    setClasses(prev => prev.map(c => c.id === activeClassId ? updater(c) : c));
  }, [activeClassId]);

  // ── Multi-class actions ──────────────────────────────────────────────────
  const setActiveClass = useCallback((id: string) => {
    setActiveClassId(id);
  }, []);

  const addClass = useCallback((name?: string): string => {
    const nextNum = classes.length + 1;
    const newClass = makeClass(name ?? `Period ${nextNum}`);
    setClasses(prev => [...prev, newClass]);
    setActiveClassId(newClass.id);
    return newClass.id;
  }, [classes.length]);

  const deleteClass = useCallback((id: string) => {
    setClasses(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(c => c.id !== id);
      setActiveClassId(cur => (cur === id ? next[0].id : cur));
      return next;
    });
  }, []);

  // ── Row actions ──────────────────────────────────────────────────────────
  const setClassName = useCallback((name: string) => {
    updateActiveClass(c => ({ ...c, name }));
  }, [updateActiveClass]);

  const updateRow = useCallback((id: number, field: keyof StudentRow, val: string) => {
    updateActiveClass(c => ({
      ...c,
      rows: c.rows.map(r => r.id === id ? { ...r, [field]: val } : r),
    }));
  }, [updateActiveClass]);

  const addRow = useCallback(() => {
    updateActiveClass(c => ({ ...c, rows: [...c.rows, mkRow()] }));
  }, [updateActiveClass]);

  const deleteRow = useCallback((id: number) => {
    updateActiveClass(c => ({
      ...c,
      rows: c.rows.length > 1 ? c.rows.filter(r => r.id !== id) : c.rows,
    }));
  }, [updateActiveClass]);

  const clearAll = useCallback(() => {
    _uid = Date.now();
    updateActiveClass(c => ({ ...c, rows: [mkRow()] }));
  }, [updateActiveClass]);

  const importCSV = useCallback((text: string): { count: number; error?: string } => {
    try {
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return { count: 0, error: "File appears empty" };
      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
      const parsed = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.replace(/"/g, "").trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
        return csvRowToRow(obj);
      });
      const valid = parsed.filter(r => r.rollCall || r.lastName || r.firstName || r.mileTime);
      if (!valid.length) return { count: 0, error: "No valid rows found in file" };
      updateActiveClass(c => {
        const keep = c.rows.filter(r => r.studentId || r.rollCall || r.lastName || r.firstName || r.mileTime);
        return { ...c, rows: [...keep, ...valid] };
      });
      return { count: valid.length };
    } catch {
      return { count: 0, error: "Could not parse file" };
    }
  }, [updateActiveClass]);

  // ── Run history ──────────────────────────────────────────────────────────
  const archiveRuns = useCallback((label?: string): number => {
    const now = new Date();
    const defaultLabel = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const entryLabel = label || defaultLabel;
    const date = now.toISOString();

    let archived = 0;
    updateActiveClass(c => ({
      ...c,
      rows: c.rows.map(r => {
        if (!r.mileTime.trim()) return r; // skip empty
        const record: RunRecord = {
          id: newRunId(),
          label: entryLabel,
          date,
          mileTime: r.mileTime,
          score: calcScore(r.mileTime, r.ttb, gradingConfig),
        };
        archived++;
        return { ...r, mileTime: "", runs: [record, ...r.runs] };
      }),
    }));
    return archived;
  }, [updateActiveClass, gradingConfig]);

  const deleteRunRecord = useCallback((studentId: number, runId: string) => {
    updateActiveClass(c => ({
      ...c,
      rows: c.rows.map(r =>
        r.id === studentId ? { ...r, runs: r.runs.filter(rec => rec.id !== runId) } : r
      ),
    }));
  }, [updateActiveClass]);

  const renameRunLabel = useCallback((oldLabel: string, newLabel: string) => {
    if (!newLabel.trim() || oldLabel === newLabel) return;
    updateActiveClass(c => ({
      ...c,
      rows: c.rows.map(r => ({
        ...r,
        runs: r.runs.map(rec => rec.label === oldLabel ? { ...rec, label: newLabel.trim() } : rec),
      })),
    }));
  }, [updateActiveClass]);

  const addRunRecord = useCallback((studentId: number, label: string, mileTime: string) => {
    updateActiveClass(c => {
      const row = c.rows.find(r => r.id === studentId);
      if (!row) return c;
      const defaultLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const record: RunRecord = {
        id: newRunId(),
        label: label.trim() || defaultLabel,
        date: new Date().toISOString(),
        mileTime,
        score: calcScore(mileTime, row.ttb, gradingConfig),
      };
      return {
        ...c,
        rows: c.rows.map(r => r.id === studentId ? { ...r, runs: [record, ...r.runs] } : r),
      };
    });
  }, [updateActiveClass, gradingConfig]);

  const moveStudentToPeriod = useCallback((studentId: number, targetClassId: string): boolean => {
    let moved = false;
    setClasses(prev => {
      const srcClass = prev.find(c => c.id === activeClassId);
      if (!srcClass) return prev;
      const student = srcClass.rows.find(r => r.id === studentId);
      if (!student) return prev;
      moved = true;
      return prev.map(c => {
        if (c.id === activeClassId) {
          return { ...c, rows: c.rows.filter(r => r.id !== studentId) };
        }
        if (c.id === targetClassId) {
          return { ...c, rows: [...c.rows, student] };
        }
        return c;
      });
    });
    return moved;
  }, [activeClassId]);

  const updateRunRecord = useCallback((
    studentId: number,
    runId: string,
    updates: Partial<Pick<RunRecord, "label" | "mileTime">>,
  ) => {
    updateActiveClass(c => ({
      ...c,
      rows: c.rows.map(r =>
        r.id === studentId
          ? { ...r, runs: r.runs.map(rec => rec.id === runId ? { ...rec, ...updates } : rec) }
          : r
      ),
    }));
  }, [updateActiveClass]);

  const importMileTimes = useCallback((text: string): { updated: number; notFound: number; error?: string } => {
    try {
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return { updated: 0, notFound: 0, error: "File appears empty" };

      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
      const norm = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");
      const findCol = (...keys: string[]) => {
        const h = headers.find(h => keys.includes(norm(h)));
        return h ? headers.indexOf(h) : -1;
      };

      const rollIdx  = findCol("roll", "rollcall", "rollno", "number", "#");
      const idIdx    = findCol("studentid", "id", "student_id", "sid");
      const timeIdx  = findCol("miletime", "time", "mile", "runtime", "milerun");

      if (timeIdx === -1) return { updated: 0, notFound: 0, error: "Could not find a mile time column. Expected a header like: Roll, Mile Time" };
      if (rollIdx === -1 && idIdx === -1) return { updated: 0, notFound: 0, error: "Could not find a Roll # or Student ID column to match students" };

      const entries: { roll?: string; sid?: string; mileTime: string }[] = [];
      for (const line of lines.slice(1)) {
        const vals = line.split(",").map(v => v.replace(/"/g, "").trim());
        const mileTime = vals[timeIdx]?.trim() ?? "";
        if (!mileTime) continue;
        entries.push({
          roll: rollIdx >= 0 ? vals[rollIdx]?.trim() : undefined,
          sid:  idIdx  >= 0 ? vals[idIdx]?.trim()  : undefined,
          mileTime,
        });
      }

      if (!entries.length) return { updated: 0, notFound: 0, error: "No data rows found in file" };

      let updated = 0;
      let notFound = 0;

      updateActiveClass(c => {
        const newRows = c.rows.map(r => {
          const matchByRoll = entries.find(e => e.roll && e.roll === r.rollCall);
          const matchBySid  = entries.find(e => e.sid  && e.sid  === r.studentId);
          const match = matchByRoll ?? matchBySid;
          if (match) { updated++; return { ...r, mileTime: match.mileTime }; }
          return r;
        });
        notFound = entries.length - updated;
        return { ...c, rows: newRows };
      });

      return { updated, notFound };
    } catch {
      return { updated: 0, notFound: 0, error: "Could not parse file" };
    }
  }, [updateActiveClass]);

  // ── Backup / restore ─────────────────────────────────────────────────────
  const restoreBackup = useCallback((newClasses: ClassRecord[], newActiveId: string) => {
    const safe = newClasses.map(c => ({
      ...c,
      rows: (Array.isArray(c.rows) ? c.rows : [mkRow()]).map(ensureRuns),
    }));
    const maxId = safe.length > 0
      ? Math.max(...safe.flatMap(c => c.rows.map((r: StudentRow) => r.id || 0)))
      : 0;
    if (maxId > _uid) _uid = maxId;
    setClasses(safe);
    const exists = safe.some(c => c.id === newActiveId);
    setActiveClassId(exists ? newActiveId : safe[0]?.id ?? "");
  }, []);

  // ── Derived scores ────────────────────────────────────────────────────────
  const withScores: StudentRowWithScore[] = rows.map(r => ({
    ...r,
    _special: getSpecial(r.mileTime, gradingConfig),
    score: calcScore(r.mileTime, r.ttb, gradingConfig),
  }));

  const graded = withScores.filter(r => r.score !== null);
  const special = withScores.filter(r => r._special);
  const avg = graded.length
    ? Math.round(graded.reduce((s, r) => s + (r.score ?? 0), 0) / graded.length)
    : null;
  const dist: [number, number][] = [100, 90, 80, 70, 65, 50].map(s => [
    s,
    graded.filter(r => r.score === s).length,
  ]);

  return (
    <GradebookContext.Provider
      value={{
        classes,
        activeClassId,
        setActiveClass,
        addClass,
        deleteClass,
        rows,
        ready,
        className,
        setClassName,
        updateRow,
        addRow,
        deleteRow,
        clearAll,
        importCSV,
        importMileTimes,
        withScores,
        stats: { total: rows.length, graded: graded.length, special: special.length, avg, dist },
        archiveRuns,
        deleteRunRecord,
        updateRunRecord,
        renameRunLabel,
        addRunRecord,
        moveStudentToPeriod,
        restoreBackup,
      }}
    >
      {children}
    </GradebookContext.Provider>
  );
}

export function useGradebook() {
  const ctx = useContext(GradebookContext);
  if (!ctx) throw new Error("useGradebook must be used within GradebookProvider");
  return ctx;
}
