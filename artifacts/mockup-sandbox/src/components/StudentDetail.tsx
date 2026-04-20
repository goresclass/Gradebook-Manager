import React, { useState, useMemo } from "react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, CornerRightUp, Trash2, Plus, X, Check, Pencil, Clock,
} from "lucide-react";
import { useGradebook, StudentRow, RunRecord } from "../contexts/GradebookContext";
import { useSettings } from "../contexts/SettingsContext";
import {
  calcScore, getSpecial, SCORE_CFG, buildSpecial, formatMMSS, parseMMSS,
} from "../utils/grading";

// ── Score Badge ────────────────────────────────────────────────────────────────

function ScoreBadge({ mileTime, score, large }: { mileTime: string; score: number | null; large?: boolean }) {
  const { gradingConfig } = useSettings();
  const sp = getSpecial(mileTime, gradingConfig);
  const size = large ? "text-xl font-bold px-4 py-2 min-w-[60px]" : "text-xs font-bold px-2 py-1 min-w-[42px]";
  if (sp) {
    return <span className={`inline-flex items-center justify-center rounded-lg ${size} ${sp.bgClass} ${sp.fgClass}`}>{sp.label}</span>;
  }
  if (score === null) {
    return <span className={`inline-flex items-center justify-center rounded-lg ${size} bg-muted text-muted-foreground`}>—</span>;
  }
  const cfg = SCORE_CFG[score];
  return <span className={`inline-flex items-center justify-center rounded-lg ${size} ${cfg.bgClass} ${cfg.fgClass}`}>{score}</span>;
}

// ── Run History Entry ──────────────────────────────────────────────────────────

function RunHistoryEntry({
  record,
  onDelete,
  onUpdateLabel,
}: {
  record: RunRecord;
  onDelete: () => void;
  onUpdateLabel: (label: string) => void;
}) {
  const cfg = record.score !== null ? SCORE_CFG[record.score] : null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(record.label);

  const commitLabel = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== record.label) onUpdateLabel(trimmed);
    else setDraft(record.label);
    setEditing(false);
  };

  const secs = parseMMSS(record.mileTime);
  const displayTime = secs !== null ? formatMMSS(secs) : record.mileTime;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={e => { if (e.key === "Enter") commitLabel(); }}
            autoFocus
            className="text-sm font-semibold text-foreground bg-transparent border-b-2 border-primary outline-none w-full"
          />
        ) : (
          <button
            onClick={() => { setDraft(record.label); setEditing(true); }}
            className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            {record.label}
            <Pencil size={10} className="text-muted-foreground" />
          </button>
        )}
        <p className="text-lg font-semibold text-accent font-mono mt-0.5">{displayTime}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {record.score !== null ? (
          <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-bold min-w-[40px] ${cfg?.bgClass} ${cfg?.fgClass}`}>
            {record.score}
          </span>
        ) : (
          <span className="inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-bold min-w-[40px] bg-muted text-muted-foreground">—</span>
        )}
        <button onClick={onDelete} className="p-1 hover:bg-destructive/10 rounded transition-colors">
          <X size={13} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

// ── Field component ────────────────────────────────────────────────────────────

function Field({
  label, field, placeholder, mono, hint, value, onChangeText, multiline,
}: {
  label: string;
  field: keyof StudentRow;
  placeholder?: string;
  mono?: boolean;
  hint?: string;
  value: string;
  onChangeText: (field: keyof StudentRow, val: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="px-4 py-3 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChangeText(field, e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={`w-full text-sm text-foreground bg-transparent outline-none resize-none ${mono ? "font-mono" : ""}`}
        />
      ) : (
        <input
          value={value}
          onChange={e => onChangeText(field, e.target.value)}
          placeholder={placeholder}
          className={`w-full text-base text-foreground bg-transparent outline-none ${mono ? "font-mono" : ""}`}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      )}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

// ── Main Student Detail ────────────────────────────────────────────────────────

export function StudentDetail({ studentId, onBack }: { studentId: number; onBack: () => void }) {
  const { rows, updateRow, deleteRow, deleteRunRecord, updateRunRecord, addRunRecord, moveStudentToPeriod, classes, activeClassId } = useGradebook();
  const { gradingConfig, swipeOrder } = useSettings();
  const SPECIAL = buildSpecial(gradingConfig);

  const [addingRun, setAddingRun] = useState(false);
  const [newRunLabel, setNewRunLabel] = useState("");
  const [newRunTime, setNewRunTime] = useState("");
  const [currentId, setCurrentId] = useState(studentId);

  const row = rows.find(r => r.id === currentId);

  // Sorted rows for navigation
  const sortedRows = useMemo(() => {
    const copy = [...rows];
    if (swipeOrder === "firstName") {
      copy.sort((a, b) => (a.firstName || "").localeCompare(b.firstName || "") || (a.lastName || "").localeCompare(b.lastName || ""));
    } else if (swipeOrder === "lastName") {
      copy.sort((a, b) => (a.lastName || "").localeCompare(b.lastName || "") || (a.firstName || "").localeCompare(b.firstName || ""));
    }
    return copy;
  }, [rows, swipeOrder]);

  const currentIndex = sortedRows.findIndex(r => r.id === currentId);
  const prevRow = currentIndex > 0 ? sortedRows[currentIndex - 1] : null;
  const nextRow = currentIndex >= 0 && currentIndex < sortedRows.length - 1 ? sortedRows[currentIndex + 1] : null;

  const navigateTo = (targetId: number) => {
    setCurrentId(targetId);
    setAddingRun(false);
    setNewRunLabel("");
    setNewRunTime("");
  };

  const handleChange = (field: keyof StudentRow, val: string) => updateRow(currentId, field, val);

  if (!row) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-[#0c1527] px-4 pb-3 pt-3 flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} className="text-slate-100" />
          </button>
          <span className="text-base font-semibold text-slate-100">Student not found</span>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <p className="text-muted-foreground">This student no longer exists.</p>
          <button onClick={onBack} className="text-primary font-semibold text-sm">Go back</button>
        </div>
      </div>
    );
  }

  const score = calcScore(row.mileTime, row.ttb, gradingConfig);
  const sp = getSpecial(row.mileTime, gradingConfig);
  const mileSeconds = parseMMSS(row.mileTime);
  const ttbSeconds = parseMMSS(row.ttb);
  const cfg = score !== null ? SCORE_CFG[score] : null;
  const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ") || "Edit Student";

  const handleDelete = () => {
    if (confirm(`Remove ${row.firstName || row.lastName || "this student"}?`)) {
      deleteRow(row.id);
      onBack();
    }
  };

  const handleMove = () => {
    const otherClasses = classes.filter(c => c.id !== activeClassId);
    if (otherClasses.length === 0) { alert("No Other Periods: Add another period first."); return; }
    const studentName = fullName;
    const choice = prompt(
      `Move ${studentName} to:\n${otherClasses.map((c, i) => `${i + 1}. ${c.name}`).join("\n")}\n\nEnter a number, or cancel:`
    );
    if (!choice) return;
    const idx = parseInt(choice) - 1;
    if (idx < 0 || idx >= otherClasses.length) return;
    const target = otherClasses[idx];
    if (confirm(`Move ${studentName} to ${target.name}?`)) {
      moveStudentToPeriod(row.id, target.id);
      onBack();
    }
  };

  const handleDeleteRun = (runId: string) => {
    if (confirm("Remove this run record from history?")) {
      deleteRunRecord(row.id, runId);
    }
  };

  const handleSaveNewRun = () => {
    const time = newRunTime.trim();
    if (!time) { alert("Please enter a mile time."); return; }
    addRunRecord(row.id, newRunLabel, time);
    setAddingRun(false);
    setNewRunLabel("");
    setNewRunTime("");
  };

  const initials = ((row.firstName?.[0] ?? "") + (row.lastName?.[0] ?? "")).toUpperCase() || "?";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#0c1527] px-3 pb-2.5 pt-2 flex items-center gap-1.5">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
          <ArrowLeft size={20} className="text-slate-100" />
        </button>

        <button
          onClick={() => prevRow && navigateTo(prevRow.id)}
          disabled={!prevRow}
          className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0 ${!prevRow ? "opacity-30" : ""}`}
        >
          <ChevronLeft size={20} className="text-slate-100" />
        </button>

        <div className="flex-1 text-center min-w-0 px-1">
          <p className="text-sm font-semibold text-slate-100 truncate">{fullName}</p>
          {sortedRows.length > 1 && (
            <p className="text-xs text-slate-500">{currentIndex + 1} / {sortedRows.length}</p>
          )}
        </div>

        <button
          onClick={() => nextRow && navigateTo(nextRow.id)}
          disabled={!nextRow}
          className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0 ${!nextRow ? "opacity-30" : ""}`}
        >
          <ChevronRight size={20} className="text-slate-100" />
        </button>

        <button onClick={handleMove} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0" title="Move to period">
          <CornerRightUp size={18} className="text-slate-400" />
        </button>
        <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0" title="Delete student">
          <Trash2 size={18} className="text-red-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {/* Score card */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
          {row.photoUrl ? (
            <img src={row.photoUrl} alt={fullName} className="w-14 h-14 rounded-full border border-border object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full border border-border bg-secondary flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-muted-foreground">{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Score</p>
            {cfg ? (
              <p className={`text-base font-bold ${cfg.barClass.replace("bg-", "text-")}`}>{cfg.label}</p>
            ) : sp ? (
              <p className={`text-base font-bold ${sp.fgClass}`}>{sp.title}</p>
            ) : (
              <p className="text-base font-bold text-muted-foreground">No time entered</p>
            )}
            {mileSeconds !== null && ttbSeconds !== null && score !== null && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Mile: {formatMMSS(mileSeconds)} · TTB: {formatMMSS(ttbSeconds)}
              </p>
            )}
          </div>
          <ScoreBadge mileTime={row.mileTime} score={score} large />
        </div>

        {/* Run History */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <div>
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">Run History</p>
              <p className="text-xs text-muted-foreground">{row.runs.length} {row.runs.length === 1 ? "entry" : "entries"}</p>
            </div>
            <button
              onClick={() => { setAddingRun(a => !a); setNewRunLabel(""); setNewRunTime(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
                ${addingRun ? "bg-secondary border-border text-muted-foreground" : "border-primary text-primary hover:bg-primary/10"}`}
            >
              {addingRun ? <X size={13} /> : <Plus size={13} />}
              {addingRun ? "Cancel" : "Add Run"}
            </button>
          </div>

          {addingRun && (
            <div className="mx-3 mb-3 p-3 rounded-xl border border-border bg-secondary space-y-2">
              <p className="text-xs font-bold text-foreground">New Run Entry</p>
              <div className="border-b border-border pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Date / Label</p>
                <input
                  value={newRunLabel}
                  onChange={e => setNewRunLabel(e.target.value)}
                  placeholder={new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  className="w-full text-sm text-foreground bg-transparent outline-none"
                />
              </div>
              <div className="border-b border-border pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Mile Time</p>
                <input
                  value={newRunTime}
                  onChange={e => setNewRunTime(e.target.value)}
                  placeholder="MM.SS (e.g. 9.30)"
                  className="w-full text-base text-foreground bg-transparent outline-none font-mono"
                  onKeyDown={e => { if (e.key === "Enter") handleSaveNewRun(); }}
                />
              </div>
              <button
                onClick={handleSaveNewRun}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-white text-sm font-bold"
              >
                <Check size={14} />
                Save to History
              </button>
            </div>
          )}

          {row.runs.length === 0 && !addingRun ? (
            <div className="flex items-start gap-2.5 px-4 pb-4 pt-1">
              <Clock size={18} className="text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">No saved runs yet. Tap "+ Add Run" to enter a past time manually.</p>
            </div>
          ) : (
            row.runs.map(rec => (
              <RunHistoryEntry
                key={rec.id}
                record={rec}
                onDelete={() => handleDeleteRun(rec.id)}
                onUpdateLabel={label => updateRunRecord(row.id, rec.id, { label })}
              />
            ))
          )}
        </div>

        {/* Student Info */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <p className="px-4 pt-3.5 pb-1 text-xs font-bold text-foreground uppercase tracking-wide">Student Info</p>
          <Field label="First Name" field="firstName" placeholder="First name" value={row.firstName} onChangeText={handleChange} />
          <Field label="Last Name" field="lastName" placeholder="Last name" value={row.lastName} onChangeText={handleChange} />
          <Field label="Student ID" field="studentId" placeholder="Student ID" mono value={row.studentId} onChangeText={handleChange} />
          <Field label="Roll Call #" field="rollCall" placeholder="#" mono value={row.rollCall} onChangeText={handleChange} />
          <Field label="Photo URL" field="photoUrl" placeholder="https://..." mono hint="Optional: paste an image URL" value={row.photoUrl} onChangeText={handleChange} />
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <p className="px-4 pt-3.5 pb-1 text-xs font-bold text-foreground uppercase tracking-wide">Notes</p>
          <Field label="" field="notes" placeholder="Add notes about this student…" value={row.notes} onChangeText={handleChange} multiline />
        </div>

        {/* Times */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <p className="px-4 pt-3.5 pb-1 text-xs font-bold text-foreground uppercase tracking-wide">Times</p>
          <Field
            label="Time to Beat (TTB)"
            field="ttb"
            placeholder="MM.SS (e.g. 9.30)"
            mono
            hint="Personal goal time for this student"
            value={row.ttb}
            onChangeText={handleChange}
          />
          <Field
            label="Mile Time"
            field="mileTime"
            placeholder="MM.SS or MU / MED / ABS / EXC"
            mono
            hint="Enter MU (make-up), MED (medical), ABS (absent), or EXC (excused)"
            value={row.mileTime}
            onChangeText={handleChange}
          />
        </div>

        {/* Special codes helper */}
        <div className="rounded-xl border border-border bg-secondary p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mile Time Codes</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SPECIAL).map(([key, val]) => (
              <span key={key} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${val.bgClass} ${val.fgClass}`}>
                <span className="font-bold">{val.label}</span>
                <span>{val.title}</span>
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Times: MM.SS format (e.g. 8.07 = 8:07 · 10.59 = 10:59)</p>
        </div>
      </div>
    </div>
  );
}
