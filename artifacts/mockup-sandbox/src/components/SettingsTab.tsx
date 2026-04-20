import React, { useEffect, useRef, useState } from "react";
import {
  Settings, RotateCcw, Key, UploadCloud, DownloadCloud, Eye, Moon, Sun, Smartphone,
  Hash, User, Users,
} from "lucide-react";
import { useGradebook, ClassRecord } from "../contexts/GradebookContext";
import { useSettings, ThemePreference, SwipeOrder } from "../contexts/SettingsContext";
import { DEFAULT_GRADING_CONFIG, formatMMSS } from "../utils/grading";

// ── Helpers ─────────────────────────────────────────────────────────────────

function secsToDisplay(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}.${s.toString().padStart(2, "0")}`;
}

function displayToSecs(val: string): number | null {
  val = val.trim();
  if (val.includes(".")) {
    const [mp, dp] = val.split(".");
    const m = parseInt(mp, 10);
    const secStr = dp.length === 1 ? dp + "0" : dp.slice(0, 2);
    const s = parseInt(secStr, 10);
    if (!isNaN(m) && !isNaN(s) && s >= 0 && s < 60) return m * 60 + s;
  }
  if (val.includes(":")) {
    const [mp, sp] = val.split(":");
    const m = parseInt(mp, 10), s = parseInt(sp, 10);
    if (!isNaN(m) && !isNaN(s) && s >= 0 && s < 60) return m * 60 + s;
  }
  const n = parseInt(val, 10);
  if (!isNaN(n)) return n * 60;
  return null;
}

function getApiBase(): string {
  return `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ""}/api`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="px-3.5 py-2 rounded-lg bg-[#0c1527] mt-4 mb-1">
      <span className="text-xs font-bold text-slate-100 tracking-wide">{icon}  {title}</span>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden mb-1 ${className}`}>
      {children}
    </div>
  );
}

function CardNote({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground leading-relaxed px-3.5 py-2.5">{text}</p>;
}

function FieldRow({
  label, hint, value, onChange, onBlur, type = "text",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 border-t border-border">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        type={type}
        className="w-20 text-sm text-center text-foreground bg-secondary border border-border rounded-lg px-2.5 py-1.5 outline-none focus:border-primary"
      />
    </div>
  );
}

// ── Cloud View Modal ─────────────────────────────────────────────────────────

type CloudClass = {
  id: string;
  name: string;
  rows: { firstName?: string; lastName?: string; mileTime?: string; ttb?: string; runs?: unknown[] }[];
};
type CloudPayload = {
  app: string;
  exportDate: string;
  gradebook: { classes: CloudClass[]; activeClassId: string };
  settings?: unknown;
};

function CloudViewModal({
  data,
  onClose,
}: {
  data: { payload: CloudPayload; savedAt: string; code: string } | null;
  onClose: () => void;
}) {
  if (!data) return null;

  const handleDownload = () => {
    const json = JSON.stringify(data.payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cloud-backup-${data.code}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="bg-[#0c1527] px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-slate-100">Cloud Snapshot</p>
          <p className="text-xs text-slate-400">Code: {data.code} · Saved {data.savedAt}</p>
        </div>
        <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-700 text-white text-sm font-semibold">
          <DownloadCloud size={14} />
          Save File
        </button>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 text-lg leading-none">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {data.payload.gradebook?.classes?.map(cls => {
          const count = cls.rows?.length ?? 0;
          return (
            <div key={cls.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#0c1527]">
                <Users size={14} className="text-slate-400" />
                <p className="text-sm font-bold text-slate-100 flex-1">{cls.name}</p>
                <p className="text-xs text-slate-400">{count} student{count !== 1 ? "s" : ""}</p>
              </div>
              {(cls.rows ?? []).map((s, i) => {
                const name = [s.firstName, s.lastName].filter(Boolean).join(" ") || "Unnamed";
                const runCount = (s.runs ?? []).length;
                return (
                  <div key={i} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i > 0 ? "border-t border-border" : ""}`}>
                    <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      {(s.ttb || runCount > 0) && (
                        <p className="text-xs text-muted-foreground">
                          {[s.ttb ? `TTB: ${s.ttb}` : null, runCount > 0 ? `${runCount} run${runCount !== 1 ? "s" : ""}` : null].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-foreground font-mono">{s.mileTime || "—"}</span>
                  </div>
                );
              })}
              {count === 0 && <p className="text-sm text-muted-foreground text-center py-3">No students in this period</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Settings Tab ────────────────────────────────────────────────────────

export function SettingsTab() {
  const { gradingConfig, updateGradingConfig, updateSpecialLabel, resetToDefaults, themePreference, setThemePreference, swipeOrder, setSwipeOrder } = useSettings();
  const { classes, activeClassId, restoreBackup } = useGradebook();

  const [syncCode, setSyncCode] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [viewBusy, setViewBusy] = useState(false);
  const [viewData, setViewData] = useState<{ payload: CloudPayload; savedAt: string; code: string } | null>(null);

  useEffect(() => {
    try {
      const code = localStorage.getItem("pe_gb_sync_code_v1");
      if (code) setSyncCode(code);
      const last = localStorage.getItem("pe_gb_last_synced_v1");
      if (last) setLastSynced(last);
    } catch {}
  }, []);

  const saveSyncCode = (code: string) => {
    setSyncCode(code);
    try { localStorage.setItem("pe_gb_sync_code_v1", code); } catch {}
  };

  // ── Cloud sync ────────────────────────────────────────────────────────────

  const handleCloudPush = async () => {
    const code = syncCode.trim().toUpperCase();
    if (!code || code.length < 4) { alert("Set a sync code (4–12 letters or numbers) before pushing."); return; }
    setSyncBusy(true);
    try {
      const payload = { app: "mile-run-grader", appVersion: 2, exportDate: new Date().toISOString(), gradebook: { classes, activeClassId }, settings: { gradingConfig } };
      const res = await fetch(`${getApiBase()}/sync/${code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`); }
      const now = new Date().toLocaleString();
      setLastSynced(now);
      try { localStorage.setItem("pe_gb_last_synced_v1", now); } catch {}
      alert(`Synced! Your data is now saved in the cloud under code ${code}.`);
    } catch (e) {
      alert(`Sync Failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally { setSyncBusy(false); }
  };

  const handleCloudPull = async () => {
    const code = syncCode.trim().toUpperCase();
    if (!code || code.length < 4) { alert("Enter the sync code used when you last pushed data."); return; }
    setSyncBusy(true);
    try {
      const res = await fetch(`${getApiBase()}/sync/${code}`);
      if (res.status === 404) { alert(`Not Found: No backup found for code ${code}.`); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data: Record<string, unknown>; updatedAt: string };
      const parsed = json.data as { app?: string; gradebook?: { classes: unknown[]; activeClassId: string }; settings?: { gradingConfig: unknown } };
      if (parsed.app !== "mile-run-grader" || !parsed.gradebook?.classes) { alert("Invalid Data: The cloud backup looks corrupted or incompatible."); return; }
      const { classes: newClasses, activeClassId: newActiveId } = parsed.gradebook;
      const totalStudents = (newClasses as { rows: unknown[] }[]).reduce((s, c) => s + c.rows.length, 0);
      const savedAt = new Date(json.updatedAt).toLocaleString();
      if (confirm(`Restore from Cloud? Found ${newClasses.length} class${newClasses.length !== 1 ? "es" : ""}, ${totalStudents} student${totalStudents !== 1 ? "s" : ""} (saved ${savedAt}).\n\nThis will replace all current data.`)) {
        restoreBackup(newClasses as Parameters<typeof restoreBackup>[0], newActiveId);
        if (parsed.settings?.gradingConfig) updateGradingConfig(parsed.settings.gradingConfig as Parameters<typeof updateGradingConfig>[0]);
        const now = new Date().toLocaleString();
        setLastSynced(now);
        try { localStorage.setItem("pe_gb_last_synced_v1", now); } catch {}
        alert("Restored: Your gradebook has been restored from the cloud.");
      }
    } catch (e) {
      alert(`Pull Failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally { setSyncBusy(false); }
  };

  const handleCloudView = async () => {
    const code = syncCode.trim().toUpperCase();
    if (!code || code.length < 4) { alert("Set a sync code first so we know what to look up."); return; }
    setViewBusy(true);
    try {
      const res = await fetch(`${getApiBase()}/sync/${code}`);
      if (res.status === 404) { alert(`Nothing Found: No data saved under code ${code} yet.`); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data: CloudPayload; updatedAt: string };
      setViewData({ payload: json.data, savedAt: new Date(json.updatedAt).toLocaleString(), code });
    } catch (e) {
      alert(`Fetch Failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally { setViewBusy(false); }
  };

  // ── Local backup ──────────────────────────────────────────────────────────

  const handleExportBackup = () => {
    const totalStudents = classes.reduce((sum, c) => sum + c.rows.length, 0);
    const payload = { app: "mile-run-grader", appVersion: 2, exportDate: new Date().toISOString(), gradebook: { classes, activeClassId }, settings: { gradingConfig } };
    const json = JSON.stringify(payload, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mile_run_backup_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert(`Backup Downloaded: ${classes.length} class${classes.length !== 1 ? "es" : ""}, ${totalStudents} students saved.`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = ev => res(ev.target?.result as string);
        r.onerror = rej;
        r.readAsText(file);
      });
      const parsed = JSON.parse(text);
      if (parsed.app !== "mile-run-grader" || !parsed.gradebook?.classes) { alert("Invalid File: This file does not appear to be a Mile Run Grader backup."); return; }
      const { classes: newClasses, activeClassId: newActiveId } = parsed.gradebook;
      const totalStudents = newClasses.reduce((s: number, c: { rows: unknown[] }) => s + c.rows.length, 0);
      if (confirm(`Restore Backup? This backup contains ${newClasses.length} class${newClasses.length !== 1 ? "es" : ""} and ${totalStudents} student${totalStudents !== 1 ? "s" : ""}.\n\nRestoring will replace all current gradebook data. This cannot be undone.`)) {
        restoreBackup(newClasses, newActiveId);
        if (parsed.settings?.gradingConfig) updateGradingConfig(parsed.settings.gradingConfig);
        alert("Restored: Gradebook data has been restored from the backup.");
      }
    } catch {
      alert("Import Failed: Could not read the file. Make sure it is a valid .json backup.");
    }
    e.target.value = "";
  };

  // ── Grading config local state ────────────────────────────────────────────

  const [tier90, setTier90] = useState(String(gradingConfig.tier90MaxSecs));
  const [tier80, setTier80] = useState(String(gradingConfig.tier80MaxSecs));
  const [thresh65, setThresh65] = useState(secsToDisplay(gradingConfig.threshold65Secs));
  const [thresh50, setThresh50] = useState(secsToDisplay(gradingConfig.threshold50Secs));
  const [muLabel, setMuLabel] = useState(gradingConfig.specialLabels.mu);
  const [medLabel, setMedLabel] = useState(gradingConfig.specialLabels.med);
  const [absLabel, setAbsLabel] = useState(gradingConfig.specialLabels.abs);
  const [excLabel, setExcLabel] = useState(gradingConfig.specialLabels.exc);

  const commitTier90 = () => {
    const v = parseInt(tier90, 10);
    if (!isNaN(v) && v >= 1 && v < gradingConfig.tier80MaxSecs) updateGradingConfig({ tier90MaxSecs: v });
    else setTier90(String(gradingConfig.tier90MaxSecs));
  };
  const commitTier80 = () => {
    const v = parseInt(tier80, 10);
    if (!isNaN(v) && v > gradingConfig.tier90MaxSecs) updateGradingConfig({ tier80MaxSecs: v });
    else setTier80(String(gradingConfig.tier80MaxSecs));
  };
  const commitThresh65 = () => {
    const secs = displayToSecs(thresh65);
    if (secs !== null && secs > 0 && secs < gradingConfig.threshold50Secs) { updateGradingConfig({ threshold65Secs: secs }); setThresh65(secsToDisplay(secs)); }
    else setThresh65(secsToDisplay(gradingConfig.threshold65Secs));
  };
  const commitThresh50 = () => {
    const secs = displayToSecs(thresh50);
    if (secs !== null && secs > gradingConfig.threshold65Secs) { updateGradingConfig({ threshold50Secs: secs }); setThresh50(secsToDisplay(secs)); }
    else setThresh50(secsToDisplay(gradingConfig.threshold50Secs));
  };

  const handleReset = () => {
    if (confirm("Reset to Defaults: This will restore all grading parameters and status code labels to their original values.")) {
      resetToDefaults();
      const d = DEFAULT_GRADING_CONFIG;
      setTier90(String(d.tier90MaxSecs));
      setTier80(String(d.tier80MaxSecs));
      setThresh65(secsToDisplay(d.threshold65Secs));
      setThresh50(secsToDisplay(d.threshold50Secs));
      setMuLabel(d.specialLabels.mu);
      setMedLabel(d.specialLabels.med);
      setAbsLabel(d.specialLabels.abs);
      setExcLabel(d.specialLabels.exc);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#0c1527] px-4 pb-3 pt-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Settings size={18} className="text-white" />
        </div>
        <div>
          <p className="text-[17px] font-bold text-slate-100">Settings</p>
          <p className="text-xs text-slate-400">Grading parameters &amp; status codes</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 pb-24">
        {/* Appearance */}
        <SectionHeader icon="🎨" title="APPEARANCE" />
        <Card>
          <div className="px-3.5 py-3">
            <p className="text-sm font-semibold text-foreground mb-2.5">Theme</p>
            <div className="flex gap-2.5">
              {([
                { opt: "system" as ThemePreference, icon: <Smartphone size={15} />, label: "System" },
                { opt: "light"  as ThemePreference, icon: <Sun size={15} />,        label: "Light"  },
                { opt: "dark"   as ThemePreference, icon: <Moon size={15} />,       label: "Dark"   },
              ]).map(({ opt, icon, label }) => {
                const active = themePreference === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setThemePreference(opt)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-[1.5px] text-sm font-semibold transition-colors
                      ${active ? "bg-primary border-primary text-white" : "bg-input border-border text-muted-foreground hover:bg-secondary"}`}
                  >
                    {icon}{label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">"System" follows your device's appearance setting automatically.</p>
          </div>
        </Card>

        {/* Swipe Order */}
        <SectionHeader icon="👆" title="SORT ORDER" />
        <Card>
          <div className="px-3.5 py-3">
            <p className="text-sm font-semibold text-foreground mb-2.5">Navigate students by</p>
            <div className="flex gap-2.5">
              {([
                { key: "roll"      as SwipeOrder, label: "Roll #",     icon: <Hash size={14} />  },
                { key: "firstName" as SwipeOrder, label: "First Name",  icon: <User size={14} />  },
                { key: "lastName"  as SwipeOrder, label: "Last Name",   icon: <Users size={14} /> },
              ]).map(({ key, label, icon }) => {
                const active = swipeOrder === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSwipeOrder(key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-[1.5px] text-xs font-semibold transition-colors
                      ${active ? "bg-primary border-primary text-white" : "bg-input border-border text-muted-foreground hover:bg-secondary"}`}
                  >
                    {icon}{label}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* TTB-based tiers */}
        <SectionHeader icon="🎯" title="TTB-BASED SCORING" />
        <Card>
          <CardNote text="These tiers apply when a student has a Time to Beat (TTB) entered and their absolute time is under the 65-point cutoff." />
          <FieldRow
            label="90-point tier"
            hint={`Within X seconds of TTB → 90 pts  (currently: ≤ ${gradingConfig.tier90MaxSecs}s)`}
            value={tier90}
            onChange={setTier90}
            onBlur={commitTier90}
            type="number"
          />
          <FieldRow
            label="80-point tier"
            hint={`Within Y seconds of TTB → 80 pts  (currently: ≤ ${gradingConfig.tier80MaxSecs}s)`}
            value={tier80}
            onChange={setTier80}
            onBlur={commitTier80}
            type="number"
          />
          <div className="flex items-start gap-2 px-3.5 py-2.5 border-t border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">Anything beyond the 80-point tier (but under the 65-point cutoff) scores 70 points. 100 points requires beating or tying the TTB.</p>
          </div>
        </Card>

        {/* Absolute time cutoffs */}
        <SectionHeader icon="⏱" title="ABSOLUTE TIME CUTOFFS" />
        <Card>
          <CardNote text="These cutoffs override TTB tiers regardless of the student's benchmark. Format: MM.SS (e.g. 12.00 = 12:00)." />
          <FieldRow
            label="65-point cutoff"
            hint={`Times ≥ this → 65 pts  (currently: ${formatMMSS(gradingConfig.threshold65Secs)})`}
            value={thresh65}
            onChange={setThresh65}
            onBlur={commitThresh65}
          />
          <FieldRow
            label="50-point cutoff"
            hint={`Times ≥ this → 50 pts  (currently: ${formatMMSS(gradingConfig.threshold50Secs)})`}
            value={thresh50}
            onChange={setThresh50}
            onBlur={commitThresh50}
          />
        </Card>

        {/* Special status labels */}
        <SectionHeader icon="🏷" title="SPECIAL STATUS CODE LABELS" />
        <Card>
          <CardNote text="Customize the display name for each status code. The codes themselves (MU, MED, ABS, EXC) entered in the Mile Time field remain unchanged." />
          {([
            { code: "MU",  key: "mu"  as const, value: muLabel,  set: setMuLabel  },
            { code: "MED", key: "med" as const, value: medLabel, set: setMedLabel },
            { code: "ABS", key: "abs" as const, value: absLabel, set: setAbsLabel },
            { code: "EXC", key: "exc" as const, value: excLabel, set: setExcLabel },
          ]).map(({ code, key, value, set }) => (
            <FieldRow
              key={code}
              label={code}
              value={value}
              onChange={set}
              onBlur={() => updateSpecialLabel(key, value.trim() || DEFAULT_GRADING_CONFIG.specialLabels[key])}
            />
          ))}
        </Card>

        {/* Cloud Sync */}
        <SectionHeader icon="🔄" title="CLOUD SYNC" />
        <Card>
          <CardNote text="Push your data to the cloud and pull it back on any device. Pick a memorable code — anyone with the same code can overwrite it, so keep it private." />
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-border">
            <Key size={15} className="text-muted-foreground flex-shrink-0" />
            <input
              value={syncCode}
              onChange={e => saveSyncCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="Your sync code (e.g. SMITH5A)"
              maxLength={12}
              disabled={syncBusy}
              className="flex-1 text-sm font-semibold tracking-widest text-foreground bg-transparent outline-none placeholder:tracking-normal placeholder:font-normal placeholder:text-muted-foreground"
            />
            {syncCode.length > 0 && (
              <button onClick={() => saveSyncCode("")} className="text-muted-foreground hover:text-foreground">✕</button>
            )}
          </div>
          {lastSynced && (
            <div className="flex items-center gap-1.5 px-3.5 py-2 border-t border-border text-xs text-muted-foreground">
              <span className="text-green-500">✓</span>
              Last synced {lastSynced}
            </div>
          )}
          <div className="flex gap-2.5 p-3 border-t border-border">
            <button onClick={handleCloudPush} disabled={syncBusy} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg bg-cyan-700 text-white text-sm font-bold disabled:opacity-50">
              <UploadCloud size={15} />Push to Cloud
            </button>
            <button onClick={handleCloudPull} disabled={syncBusy} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg bg-purple-700 text-white text-sm font-bold disabled:opacity-50">
              <DownloadCloud size={15} />Pull from Cloud
            </button>
          </div>
          <div className="px-3 pb-3 border-t border-border pt-1">
            <button
              onClick={handleCloudView}
              disabled={viewBusy || syncBusy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border text-muted-foreground text-sm font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <Eye size={14} />
              {viewBusy ? "Loading…" : "View Stored Data"}
            </button>
          </div>
        </Card>

        {/* Local Backup */}
        <SectionHeader icon="☁️" title="LOCAL BACKUP (FILE)" />
        <Card>
          <CardNote text="Export your entire gradebook (all periods, all run history) as a JSON file. Restore it on any device running this app." />
          <button
            onClick={handleExportBackup}
            className="w-full flex items-center gap-3 px-3.5 py-3.5 border-t border-border hover:bg-secondary transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-cyan-700 flex items-center justify-center flex-shrink-0">
              <UploadCloud size={15} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">Export Backup</p>
              <p className="text-xs text-muted-foreground">{classes.length} class{classes.length !== 1 ? "es" : ""} · {classes.reduce((s, c) => s + c.rows.length, 0)} students · includes run history</p>
            </div>
            <span className="text-muted-foreground">›</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-3.5 py-3.5 border-t border-border hover:bg-secondary transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-700 flex items-center justify-center flex-shrink-0">
              <DownloadCloud size={15} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">Restore from Backup</p>
              <p className="text-xs text-muted-foreground">Pick a .json backup file to replace all current data</p>
            </div>
            <span className="text-muted-foreground">›</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
        </Card>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 mt-4 py-3.5 rounded-xl border border-dashed border-border text-red-400 text-sm font-semibold hover:bg-red-500/5 transition-colors"
        >
          <RotateCcw size={14} />
          Reset All to Defaults
        </button>
      </div>

      {/* Cloud view modal */}
      {viewData && <CloudViewModal data={viewData} onClose={() => setViewData(null)} />}
    </div>
  );
}
