import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { calcScore, getField, getSpecial, normalizeKey } from "@/utils/grading";
import { useSettings } from "@/context/SettingsContext";

let _uid = Date.now();

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
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [ready, setReady] = useState(false);
  const [className, setClassName] = useState("Period 2");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { rows: r, className: cn } = JSON.parse(saved);
          if (r?.length) {
            _uid = Math.max(...r.map((x: StudentRow) => x.id || 0));
            setRows(r);
          } else {
            setRows([mkRow()]);
          }
          if (cn) setClassName(cn);
        } else {
          setRows([mkRow()]);
        }
      } catch {
        setRows([mkRow()]);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ rows, className })).catch(() => {});
    }, 500);
  }, [rows, className, ready]);

  const updateRow = useCallback((id: number, field: keyof StudentRow, val: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  }, []);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, mkRow()]);
  }, []);

  const deleteRow = useCallback((id: number) => {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  }, []);

  const clearAll = useCallback(() => {
    _uid = Date.now();
    setRows([mkRow()]);
  }, []);

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
      setRows(prev => {
        const keep = prev.filter(r => r.studentId || r.rollCall || r.lastName || r.firstName || r.mileTime);
        return [...keep, ...valid];
      });
      return { count: valid.length };
    } catch {
      return { count: 0, error: "Could not parse file" };
    }
  }, []);

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
