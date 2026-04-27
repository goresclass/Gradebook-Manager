import { useMemo, useRef, useState, useCallback } from "react";
import {
  Activity, Archive, Download, Globe, Plus, Search, Trash2, Upload, UserPlus, X, Pencil,
  Calendar, ChevronDown,
} from "lucide-react";
import { useGradebook, StudentRow } from "../contexts/GradebookContext";
import { useSettings } from "../contexts/SettingsContext";
import { calcScore, getSpecial, SCORE_CFG, formatMMSS, parseMMSS } from "../utils/grading";

type SortField = "rollCall" | "lastName" | "firstName" | "score";

// ── Score Badge ────────────────────────────────────────────────────────────────

function ScoreBadge({ mileTime, score }: { mileTime: string; score: number | null }) {
  const { gradingConfig } = useSettings();
  const sp = getSpecial(mileTime, gradingConfig);
  if (sp) {
    return (
      <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold min-w-[42px] ${sp.bgClass} ${sp.fgClass}`}>
        {sp.label}
      </span>
    );
  }
  if (score === null) {
    return <span className="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold min-w-[42px] bg-muted text-muted-foreground">—</span>;
  }
  const cfg = SCORE_CFG[score];
  return (
    <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold min-w-[42px] ${cfg.bgClass} ${cfg.fgClass}`}>
      {score}
    </span>
  );
}

// ── Student Card ───────────────────────────────────────────────────────────────

function StudentCard({
  row,
  index,
  onDelete,
  onPress,
  periodLabel,
}: {
  row: StudentRow;
  index: number;
  onDelete: (id: number) => void;
  onPress: (row: StudentRow) => void;
  periodLabel?: string;
}) {
  const { gradingConfig } = useSettings();
  const score = calcScore(row.mileTime, row.ttb, gradingConfig);
  const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unnamed Student";
  const mileSeconds = parseMMSS(row.mileTime);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Remove ${row.firstName || row.lastName || "this student"}?`)) {
      onDelete(row.id);
    }
  };

  const initials = ((row.firstName?.[0] ?? "") + (row.lastName?.[0] ?? "")).toUpperCase() || "?";

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-secondary/50 transition-colors mb-2"
      onClick={() => onPress(row)}
    >
      {/* Roll badge */}
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
        <span className="text-xs font-bold text-muted-foreground tabular-nums">
          {row.rollCall || String(index + 1)}
        </span>
      </div>

      {/* Avatar */}
      {row.photoUrl ? (
        <img
          src={row.photoUrl}
          alt={fullName}
          className="w-10 h-10 rounded-full border border-border object-cover flex-shrink-0"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="w-10 h-10 rounded-full border border-border bg-secondary flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-muted-foreground">{initials}</span>
        </div>
      )}

      {/* Name + time */}
      <div className="flex-1 min-w-0">
        {periodLabel && (
          <span className="text-xs font-bold text-primary mr-2">[{periodLabel}]</span>
        )}
        <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {row.ttb && (
            <span className="text-xs text-muted-foreground">TTB: {row.ttb}</span>
          )}
          {row.mileTime ? (
            <span className="text-xs font-medium text-accent tabular-nums">{row.mileTime}</span>
          ) : (
            <span className="text-xs text-muted-foreground">No time entered</span>
          )}
        </div>
        {mileSeconds !== null && row.ttb && (
          <span className="text-xs text-muted-foreground tabular-nums">{formatMMSS(mileSeconds)}</span>
        )}
      </div>

      {/* Score */}
      <ScoreBadge mileTime={row.mileTime} score={score} />

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="flex-shrink-0 p-1 rounded hover:bg-destructive/10 transition-colors"
        title="Remove student"
      >
        <Trash2 size={14} className="text-muted-foreground" />
      </button>
    </div>
  );
}

// ── Period Switcher ────────────────────────────────────────────────────────────

function PeriodSwitcher() {
  const { classes, activeClassId, setActiveClass, addClass, deleteClass, setClassName, className } = useGradebook();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChipClick = (id: string) => {
    if (id === activeClassId) {
      setEditValue(className);
      setEditingId(id);
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setActiveClass(id);
    }
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) setClassName(editValue.trim());
    setEditingId(null);
  };

  const handleAdd = () => {
    const nextNum = classes.length + 1;
    const defaultName = `Period ${nextNum}`;
    const newId = addClass(defaultName);
    setTimeout(() => {
      setEditValue(defaultName);
      setEditingId(newId);
      setTimeout(() => inputRef.current?.focus(), 10);
    }, 50);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (classes.length <= 1) { alert("You need at least one class period."); return; }
    const cls = classes.find(c => c.id === id);
    const count = cls?.rows.filter(r => r.rollCall || r.lastName || r.firstName || r.mileTime).length ?? 0;
    const msg = count > 0
      ? `Delete "${cls?.name}"? This will remove all ${count} student${count !== 1 ? "s" : ""}. This cannot be undone.`
      : `Delete "${cls?.name}"? This cannot be undone.`;
    if (confirm(msg)) deleteClass(id);
  };

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {classes.map(cls => {
        const isActive = cls.id === activeClassId;
        const isEditing = editingId === cls.id;
        return (
          <div
            key={cls.id}
            className={`flex-shrink-0 flex items-center rounded-full px-4 py-1.5 cursor-pointer transition-colors
              ${isActive ? "bg-primary text-white" : "bg-secondary border border-border text-muted-foreground hover:bg-secondary/80"}`}
            onClick={() => handleChipClick(cls.id)}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => { if (e.key === "Enter") commitEdit(); }}
                className="bg-transparent text-white text-sm font-semibold outline-none min-w-[80px] w-24"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <>
                <span className={`text-sm font-medium ${isActive ? "font-bold" : ""}`}>{cls.name}</span>
                {isActive && <Pencil size={10} className="ml-1.5 opacity-60" />}
              </>
            )}
            {!isEditing && classes.length > 1 && (
              <button
                onClick={e => handleDelete(e, cls.id)}
                className="ml-1.5 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                title="Delete period"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
      <button
        onClick={handleAdd}
        className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary/80 transition-colors"
        title="Add period"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

// ── Archive Dates Modal ────────────────────────────────────────────────────────

function ArchiveDatesModal({ open, onClose, rows, onRename }: {
  open: boolean;
  onClose: () => void;
  rows: StudentRow[];
  onRename: (oldLabel: string, newLabel: string) => void;
}) {
  const uniqueLabels = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of rows) for (const run of r.runs) {
      if (!seen.has(run.label)) { seen.add(run.label); out.push(run.label); }
    }
    return out;
  }, [rows]);

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useMemo(() => {
    if (open) {
      const init: Record<string, string> = {};
      uniqueLabels.forEach(l => { init[l] = l; });
      setDrafts(init);
    }
  }, [open, uniqueLabels]);

  const countFor = (label: string) =>
    rows.reduce((n, r) => n + r.runs.filter(rec => rec.label === label).length, 0);

  const commitRename = (oldLabel: string) => {
    const newLabel = drafts[oldLabel]?.trim();
    if (newLabel && newLabel !== oldLabel) onRename(oldLabel, newLabel);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card border border-border rounded-t-2xl max-h-[75vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center pt-3 pb-4 border-b border-border px-5">
          <div className="w-9 h-1 rounded-full bg-border mb-3" />
          <h3 className="text-base font-bold text-foreground">Edit Archive Dates</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Changes apply to every student in this period</p>
        </div>

        <div className="overflow-y-auto flex-1">
          {uniqueLabels.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Calendar size={28} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No archived runs yet</p>
            </div>
          ) : (
            uniqueLabels.map((label, idx) => (
              <div key={label} className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? "border-t border-border" : ""}`}>
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <Calendar size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    value={drafts[label] ?? label}
                    onChange={e => setDrafts(prev => ({ ...prev, [label]: e.target.value }))}
                    onBlur={() => commitRename(label)}
                    onKeyDown={e => { if (e.key === "Enter") commitRename(label); }}
                    className="text-sm font-semibold text-foreground bg-transparent border-b border-border w-full outline-none focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">{countFor(label)} student{countFor(label) !== 1 ? "s" : ""}</p>
                </div>
                {drafts[label]?.trim() !== label && drafts[label]?.trim() && (
                  <button
                    onClick={() => commitRename(label)}
                    className="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold"
                  >
                    Save
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border">
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-primary text-white font-bold">Done</button>
        </div>
      </div>
    </div>
  );
}

// ── Import CSV Dialog ──────────────────────────────────────────────────────────

function ImportDialog({ open, onClose, onImportRoster, onImportTimes }: {
  open: boolean;
  onClose: () => void;
  onImportRoster: (text: string) => void;
  onImportTimes: (text: string) => void;
}) {
  const rosterInputRef = useRef<HTMLInputElement>(null);
  const timesInputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = e => resolve(e.target?.result as string);
      r.onerror = reject;
      r.readAsText(file);
    });

  const handleRoster = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFile(file);
      onImportRoster(text);
      onClose();
    } catch { alert("Could not read file"); }
    e.target.value = "";
  };

  const handleTimes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFile(file);
      onImportTimes(text);
      onClose();
    } catch { alert("Could not read file"); }
    e.target.value = "";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-72 shadow-xl" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">Import CSV</p>
        <p className="text-xs text-muted-foreground px-4 pb-3">What would you like to import?</p>
        <div className="border-t border-border">
          <button
            className="w-full px-4 py-3 text-sm text-foreground hover:bg-secondary text-left"
            onClick={() => rosterInputRef.current?.click()}
          >
            Full Roster
          </button>
          <button
            className="w-full px-4 py-3 text-sm text-foreground hover:bg-secondary text-left border-t border-border"
            onClick={() => timesInputRef.current?.click()}
          >
            Mile Times Only
          </button>
          <button
            className="w-full px-4 py-3 text-sm text-muted-foreground hover:bg-secondary text-left border-t border-border"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
      <input ref={rosterInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleRoster} />
      <input ref={timesInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleTimes} />
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, barClass }: { label: string; value: number | string; barClass?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1">
      {barClass && <div className={`w-2 h-2 rounded-sm ${barClass}`} />}
      <span className="text-xs font-semibold text-foreground tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// ── Main Gradebook Tab ─────────────────────────────────────────────────────────

export function GradebookTab({ onOpenStudent, onOpenExport }: {
  onOpenStudent: (id: number) => void;
  onOpenExport: () => void;
}) {
  const { rows, ready, addRow, deleteRow, updateRow, clearAll, importCSV, importMileTimes, withScores, stats, className, archiveRuns, renameRunLabel, classes, setActiveClass, activeClassId } = useGradebook();

  const [search, setSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState(false);
  const [sortCol, setSortCol] = useState<SortField>("rollCall");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleSort = useCallback((col: SortField) => {
    setSortCol(prev => {
      setSortDir(prev === col ? d => (d * -1) as 1 | -1 : () => 1);
      return col;
    });
  }, []);

  const sorted = useMemo(() => {
    const filtered = withScores.filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.firstName.toLowerCase().includes(q) ||
        r.lastName.toLowerCase().includes(q) ||
        r.studentId.toLowerCase().includes(q) ||
        r.rollCall.toLowerCase().includes(q)
      );
    });
    return [...filtered].sort((a, b) => {
      let av: string | number = a[sortCol] ?? "";
      let bv: string | number = b[sortCol] ?? "";
      if (sortCol === "rollCall") { av = parseInt(String(av)) || 0; bv = parseInt(String(bv)) || 0; }
      if (sortCol === "score") { av = a.score ?? -1; bv = b.score ?? -1; }
      return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
    });
  }, [withScores, search, sortCol, sortDir]);

  type GlobalRow = (typeof rows)[number] & { classId: string; classLabel: string };
  const globalSorted = useMemo<GlobalRow[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const out: GlobalRow[] = [];
    for (const cls of classes) {
      for (const r of cls.rows) {
        if (
          r.firstName.toLowerCase().includes(q) ||
          r.lastName.toLowerCase().includes(q) ||
          r.studentId.toLowerCase().includes(q) ||
          r.rollCall.toLowerCase().includes(q)
        ) {
          out.push({ ...r, classId: cls.id, classLabel: cls.name });
        }
      }
    }
    return out.sort((a, b) => {
      const af = `${a.lastName} ${a.firstName}`.toLowerCase();
      const bf = `${b.lastName} ${b.firstName}`.toLowerCase();
      return af < bf ? -1 : af > bf ? 1 : 0;
    });
  }, [classes, search]);

  const handleImportRoster = (text: string) => {
    const { count, error } = importCSV(text);
    if (error) alert(`Import Failed: ${error}`);
    else alert(`Imported: ${count} student${count !== 1 ? "s" : ""} added to the roster.`);
  };

  const handleImportTimes = (text: string) => {
    const { updated, notFound, error } = importMileTimes(text);
    if (error) alert(`Import Failed: ${error}`);
    else {
      const msg = notFound > 0
        ? `${updated} student${updated !== 1 ? "s" : ""} updated.\n${notFound} row${notFound !== 1 ? "s" : ""} didn't match any student.`
        : `${updated} student${updated !== 1 ? "s" : ""} updated.`;
      alert(`Mile Times Imported: ${msg}`);
    }
  };

  const hasArchivedRuns = rows.some(r => r.runs.length > 0);

  const handleArchiveRuns = () => {
    const withTime = rows.filter(r => r.mileTime.trim()).length;
    if (hasArchivedRuns) {
      const opts = [];
      if (withTime > 0) opts.push(`Archive Current Run (${withTime} students)`);
      opts.push("Edit Archive Dates");
      opts.push("Cancel");
      const choice = prompt(`Archive:\n${opts.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n\nEnter 1-${opts.length}:`);
      if (!choice) return;
      const idx = parseInt(choice) - 1;
      if (idx === 0 && withTime > 0) {
        if (confirm(`Save mile times for ${withTime} student${withTime !== 1 ? "s" : ""} in "${className}"?`)) {
          const count = archiveRuns();
          alert(`Archived: ${count} run${count !== 1 ? "s" : ""} saved.`);
        }
      } else if ((idx === 0 && withTime === 0) || (idx === 1 && withTime > 0)) {
        setShowDatesModal(true);
      }
      return;
    }
    if (withTime === 0) { alert("Nothing to Archive: No students have a mile time entered yet."); return; }
    if (confirm(`Archive Run Scores: Save current mile times for ${withTime} student${withTime !== 1 ? "s" : ""} in "${className}" as a history entry?`)) {
      const count = archiveRuns();
      alert(`Archived: ${count} run${count !== 1 ? "s" : ""} saved to student history.`);
    }
  };

  const handleClearAll = () => {
    if (confirm(`Clear All Student Data? This will delete every row in "${className}" and start a fresh sheet. This cannot be undone.`)) {
      clearAll();
    }
  };

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center gap-3">
          <Activity size={32} className="text-primary mx-auto mb-2 animate-pulse" />
          <p className="text-muted-foreground text-sm">Loading gradebook…</p>
        </div>
      </div>
    );
  }

  const isGlobalMode = globalSearch && !!search.trim();
  const displayRows = isGlobalMode ? globalSorted : sorted;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#0c1527] px-4 pb-3">
        <div className="flex items-center justify-between mb-3 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Activity size={18} className="text-white" />
            </div>
            <span className="text-[17px] font-bold text-slate-100">Mile Run Grader</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImportDialog(true)} className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center hover:bg-purple-700 transition-colors" title="Import CSV">
              <Upload size={16} className="text-white" />
            </button>
            <button onClick={handleArchiveRuns} className="w-9 h-9 rounded-lg bg-cyan-700 flex items-center justify-center hover:bg-cyan-800 transition-colors" title="Archive runs">
              <Archive size={16} className="text-white" />
            </button>
            <button onClick={addRow} className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors" title="Add student">
              <UserPlus size={16} className="text-white" />
            </button>
            <button onClick={onOpenExport} className="w-9 h-9 rounded-lg bg-green-700 flex items-center justify-center hover:bg-green-800 transition-colors" title="Export">
              <Download size={16} className="text-white" />
            </button>
            <button onClick={handleClearAll} className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center hover:bg-red-500/25 transition-colors" title="Clear all">
              <Trash2 size={16} className="text-red-400" />
            </button>
          </div>
        </div>

        {/* Period switcher */}
        <PeriodSwitcher />

        {/* Search */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 flex items-center gap-2 bg-white/8 rounded-lg px-3 py-2">
            <Search size={15} className="text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students…"
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
            />
            {search && (
              <button onClick={() => { setSearch(""); setGlobalSearch(false); }}>
                <X size={15} className="text-slate-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setGlobalSearch(g => !g)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${globalSearch ? "bg-primary" : "bg-white/8 hover:bg-white/15"}`}
            title="Search all periods"
          >
            <Globe size={15} className={globalSearch ? "text-white" : "text-slate-400"} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center overflow-x-auto bg-secondary border-b border-border h-12 flex-shrink-0">
        <StatCard label="Students" value={stats.total} />
        <div className="w-px h-4 bg-border" />
        <StatCard label="Graded" value={stats.graded} />
        {stats.special > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <StatCard label="Special" value={stats.special} />
          </>
        )}
        <div className="w-px h-4 bg-border" />
        <StatCard label="Avg" value={stats.avg ?? "—"} />
        {stats.dist.map(([s, cnt]) => cnt > 0 ? (
          <React.Fragment key={s}>
            <div className="w-px h-4 bg-border" />
            <StatCard label={`${s}s`} value={cnt} barClass={SCORE_CFG[s]?.barClass} />
          </React.Fragment>
        ) : null)}
      </div>

      {/* Sort buttons — hidden during global search */}
      {!isGlobalMode && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card border-b border-border overflow-x-auto flex-shrink-0 h-9">
          {([["rollCall", "Roll #"], ["lastName", "Last Name"], ["firstName", "First Name"], ["score", "Score"]] as [SortField, string][]).map(([col, label]) => (
            <button
              key={col}
              onClick={() => handleSort(col)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${sortCol === col ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {label} {sortCol === col ? (sortDir === 1 ? "↑" : "↓") : ""}
            </button>
          ))}
        </div>
      )}

      {/* Global search info bar */}
      {isGlobalMode && (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-secondary border-b border-border text-xs text-muted-foreground flex-shrink-0">
          <Globe size={12} className="text-primary" />
          Searching all {classes.length} period{classes.length !== 1 ? "s" : ""} · {globalSorted.length} result{globalSorted.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-24">
        {displayRows.length === 0 ? (
          <div className="flex flex-col items-center pt-16 gap-3">
            <Search size={40} className="text-muted-foreground" />
            <p className="text-base font-semibold text-muted-foreground">
              {isGlobalMode ? "No students found" : "No students yet"}
            </p>
            <p className="text-sm text-muted-foreground text-center px-10">
              {isGlobalMode
                ? `No matches across any period for "${search}"`
                : "Tap the + button above to add your first student"}
            </p>
          </div>
        ) : (
          <>
            {displayRows.map((item, idx) => {
              const gItem = item as typeof globalSorted[number];
              return (
                <div key={isGlobalMode ? `${gItem.classId}-${item.id}` : String(item.id)}>
                  {isGlobalMode && (
                    <div className="px-1 pt-2 pb-0.5">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {gItem.classLabel}
                      </span>
                    </div>
                  )}
                  <StudentCard
                    row={item}
                    index={idx}
                    onDelete={isGlobalMode ? () => {} : deleteRow}
                    onPress={row => {
                      if (isGlobalMode) {
                        setActiveClass(gItem.classId);
                        setTimeout(() => onOpenStudent(row.id), 50);
                      } else {
                        onOpenStudent(row.id);
                      }
                    }}
                  />
                </div>
              );
            })}

            {/* Add row footer */}
            {!isGlobalMode && sorted.length > 0 && (
              <button
                onClick={addRow}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-dashed border-border text-muted-foreground hover:bg-secondary transition-colors mt-1 mb-4"
              >
                <Plus size={16} />
                <span className="text-sm font-medium">Add student row</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <ArchiveDatesModal
        open={showDatesModal}
        onClose={() => setShowDatesModal(false)}
        rows={rows}
        onRename={renameRunLabel}
      />
      <ImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportRoster={handleImportRoster}
        onImportTimes={handleImportTimes}
      />
    </div>
  );
}

// Make React available for JSX
import React from "react";
