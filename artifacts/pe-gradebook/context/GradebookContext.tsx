import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { calcScore, getField, getSpecial, normalizeKey } from "@/utils/grading";
import { useSettings } from "@/context/SettingsContext";

let _uid = Date.now();
let _classUid = Date.now() + 1000000;

export type StudentRow = {
  id: number;
  studentId: string;
  rollCall: string;
  lastName: string;
  firstName: string;
  ttb: string;
  mileTime: string;
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

export function mkRow(overrides: Partial<StudentRow> = {}): StudentRow {
  return {
    id: ++_uid,
    studentId: "",
    rollCall: "",
    lastName: "",
    firstName: "",
    ttb: "",
    mileTime: "",
    ...overrides,
  };
}

function newClassId(): string {
  return String(++_classUid);
}

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
  });
}

type GradebookContextType = {
  // Multi-class management
  classes: ClassRecord[];
  activeClassId: string;
  setActiveClass: (id: string) => void;
  addClass: (name?: string) => string;
  deleteClass: (id: string) => void;
  // Active-class proxies (same API as before)
  rows: StudentRow[];
  ready: boolean;
  className: string;
  setClassName: (name: string) => void;
  updateRow: (id: number, field: keyof StudentRow, val: string) => void;
  addRow: () => void;
  deleteRow: (id: number) => void;
  clearAll: () => void;
  importCSV: (text: string) => { count: number; error?: string };
  withScores: StudentRowWithScore[];
  stats: {
    total: number;
    graded: number;
    special: number;
    avg: number | null;
    dist: [number, number][];
  };
};

const GradebookContext = createContext<GradebookContextType | null>(null);

const STORAGE_KEY = "pe_gb_mobile_v1";

export function GradebookProvider({ children }: { children: React.ReactNode }) {
  const { gradingConfig } = useSettings();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [activeClassId, setActiveClassId] = useState<string>("");
  const [ready, setReady] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load & migrate ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);

          // v2 format: { classes: [...], activeClassId: "..." }
          if (parsed.classes && Array.isArray(parsed.classes) && parsed.classes.length > 0) {
            // Ensure every class has at least one row
            const loadedClasses: ClassRecord[] = parsed.classes.map((c: ClassRecord) => ({
              ...c,
              rows: Array.isArray(c.rows) && c.rows.length > 0 ? c.rows : [mkRow()],
            }));
            const maxId = Math.max(...loadedClasses.flatMap(c => c.rows.map((r: StudentRow) => r.id || 0)));
            if (maxId > _uid) _uid = maxId;
            setClasses(loadedClasses);
            const activeExists = loadedClasses.some(c => c.id === parsed.activeClassId);
            setActiveClassId(activeExists ? parsed.activeClassId : loadedClasses[0].id);

          // v1 format: { rows: [...], className: "..." }
          } else if (parsed.rows && Array.isArray(parsed.rows)) {
            const migratedRows: StudentRow[] = parsed.rows.length > 0 ? parsed.rows : [mkRow()];
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

  // ── Persist ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ classes, activeClassId })).catch(() => {});
    }, 500);
  }, [classes, activeClassId, ready]);

  // ── Active class helpers ──────────────────────────────────────────────────
  const activeClass = classes.find(c => c.id === activeClassId) ?? classes[0];
  const rows = activeClass?.rows ?? [];
  const className = activeClass?.name ?? "";

  const updateActiveClass = useCallback((updater: (c: ClassRecord) => ClassRecord) => {
    setClasses(prev => prev.map(c => c.id === activeClassId ? updater(c) : c));
  }, [activeClassId]);

  // ── Multi-class actions ───────────────────────────────────────────────────
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
      if (prev.length <= 1) return prev; // cannot delete last class
      const next = prev.filter(c => c.id !== id);
      setActiveClassId(cur => {
        if (cur === id) return next[0].id;
        return cur;
      });
      return next;
    });
  }, []);

  // ── Row actions (operate on active class) ─────────────────────────────────
  const setClassName = useCallback((name: string) => {
    updateActiveClass(c => ({ ...c, name }));
  }, [updateActiveClass]);

  const updateRow = useCallback((id: number, field: keyof StudentRow, val: string) => {
    updateActiveClass(c => ({ ...c, rows: c.rows.map(r => r.id === id ? { ...r, [field]: val } : r) }));
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
        withScores,
        stats: { total: rows.length, graded: graded.length, special: special.length, avg, dist },
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
