import { useState, useEffect, useRef, useCallback } from "react";

function parseMMSS(raw) {
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

const SPECIAL = {
  mu:  { label: "MU",  title: "Make-Up",  bg: "#fef9c3", fg: "#854d0e" },
  med: { label: "MED", title: "Medical",  bg: "#f0fdf4", fg: "#166534" },
  abs: { label: "ABS", title: "Absent",   bg: "#f1f5f9", fg: "#475569" },
  exc: { label: "EXC", title: "Excused",  bg: "#f5f3ff", fg: "#5b21b6" },
};
function getSpecial(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  for (const [key] of Object.entries(SPECIAL)) {
    if (s.startsWith(key)) return SPECIAL[key];
  }
  return null;
}

function calcScore(mileRaw, ttbRaw) {
  if (getSpecial(mileRaw)) return null;
  const mt = parseMMSS(mileRaw);
  if (mt === null) return null;
  if (mt >= 960) return 50;
  if (mt >= 720) return 65;
  const ttb = parseMMSS(ttbRaw);
  if (ttb !== null) {
    if (mt <= ttb)  return 100;
    const diff = mt - ttb;
    if (diff <= 10) return 90;
    if (diff <= 29) return 80;
    return 70;
  }
  return 50;
}

const SCORE_CFG = {
  100: { bg: "#dcfce7", fg: "#14532d", bar: "#22c55e", label: "Beat TTB"        },
  90:  { bg: "#dbeafe", fg: "#1e3a8a", bar: "#3b82f6", label: "≤ 0:10 above"    },
  80:  { bg: "#e0f2fe", fg: "#0c4a6e", bar: "#0ea5e9", label: "≤ 0:29 above"    },
  70:  { bg: "#fef9c3", fg: "#78350f", bar: "#f59e0b", label: "0:30+ above TTB" },
  65:  { bg: "#ffedd5", fg: "#7c2d12", bar: "#f97316", label: "12:00–15:59"      },
  50:  { bg: "#fee2e2", fg: "#7f1d1d", bar: "#ef4444", label: "≥ 16:00 / other" },
};

let _uid = Date.now();
const mkRow = (overrides = {}) => ({
  id: ++_uid, studentId: "", rollCall: "", lastName: "", firstName: "", ttb: "", mileTime: "",
  ...overrides,
});

function normalizeKey(k) { return String(k).toLowerCase().replace(/[\s_\-\.]/g, ""); }
function getField(obj, ...aliases) {
  const norm = {};
  for (const k of Object.keys(obj)) norm[normalizeKey(k)] = obj[k];
  for (const alias of aliases) {
    const v = norm[normalizeKey(alias)];
    if (v !== undefined && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}
function csvRowToRow(raw) {
  return mkRow({
    studentId: getField(raw, "studentid", "student id", "id", "student_id"),
    rollCall:  getField(raw, "rollcall", "roll call", "roll", "number", "#"),
    lastName:  getField(raw, "lastname", "last name", "last", "surname"),
    firstName: getField(raw, "firstname", "first name", "first", "given"),
    ttb:       getField(raw, "timetobeat", "time to beat", "ttb", "goal", "goaltime"),
    mileTime:  getField(raw, "miletime", "mile time", "mile", "time", "runtime"),
  });
}

export default function PEGradeBook() {
  const [rows, setRows]               = useState([]);
  const [ready, setReady]             = useState(false);
  const [className, setClassName]     = useState("Period 2");
  const [toast, setToast]             = useState(null);
  const [sortCol, setSortCol]         = useState("rollCall");
  const [sortDir, setSortDir]         = useState(1);
  const [csvModal, setCsvModal]       = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileRef  = useRef();
  const toastRef = useRef();

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    document.head.appendChild(s);
    (async () => {
      try {
        const saved = await window.storage.get("pe_gb3");
        if (saved) {
          const { rows: r, className: cn } = JSON.parse(saved.value);
          if (r?.length) { _uid = Math.max(...r.map(x => x.id || 0)); setRows(r); }
          else setRows([mkRow()]);
          if (cn) setClassName(cn);
        } else setRows([mkRow()]);
      } catch { setRows([mkRow()]); }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready)
      window.storage.set("pe_gb3", JSON.stringify({ rows, className })).catch(() => {});
  }, [rows, className, ready]);

  const showToast = useCallback((msg, ok = true) => {
    clearTimeout(toastRef.current);
    setToast({ msg, ok });
    toastRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const update       = (id, field, val) => setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  const addRow       = () => setRows(prev => [...prev, mkRow()]);
  const delRow       = id => setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  const clearAll     = () => setConfirmOpen(true);
  const confirmClear = () => { _uid = Date.now(); setRows([mkRow()]); setConfirmOpen(false); showToast("Sheet cleared — ready for new class"); };

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = "";
    const ext = file.name.split(".").pop().toLowerCase();
    const ingest = parsed => {
      const valid = parsed.filter(r => r.rollCall || r.lastName || r.firstName || r.mileTime);
      if (!valid.length) { showToast("No valid rows found in file", false); return; }
      setRows(prev => { const keep = prev.filter(r => r.studentId || r.rollCall || r.lastName || r.firstName || r.mileTime); return [...keep, ...valid]; });
      showToast(`Imported ${valid.length} student${valid.length !== 1 ? "s" : ""} successfully`);
    };
    if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = ev => {
        const lines = ev.target.result.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { showToast("File appears empty", false); return; }
        const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
        const parsed = lines.slice(1).map(line => { const vals = line.split(",").map(v => v.replace(/"/g, "").trim()); const obj = {}; headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; }); return csvRowToRow(obj); });
        ingest(parsed);
      };
      reader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = ev => {
        if (!window.XLSX) { showToast("XLSX library loading — try again in a moment", false); return; }
        try { const wb = window.XLSX.read(ev.target.result, { type: "array" }); ingest(window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]).map(csvRowToRow)); }
        catch { showToast("Could not read XLSX file", false); }
      };
      reader.readAsArrayBuffer(file);
    } else { showToast("Please upload a .csv or .xlsx file", false); }
  };

  const exportCSV = useCallback(() => {
    const headers  = ["Student ID", "Roll Call", "Last Name", "First Name", "Time to Beat", "Mile Time", "Score"];
    const escape   = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const dataRows = rows.map(r => { const score = calcScore(r.mileTime, r.ttb); const sp = getSpecial(r.mileTime); const sv = sp ? sp.label : (score !== null ? score : ""); return [r.studentId, r.rollCall, r.lastName, r.firstName, r.ttb, r.mileTime, sv].map(escape).join(","); });
    const csv = [headers.map(escape).join(","), ...dataRows].join("\n");
    const safeName = className.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "gradebook";
    const fileName = `${safeName}_grades.csv`;
    try { const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); } catch (_) {}
    setCsvModal({ csv, fileName });
  }, [rows, className]);

  const handleSort = col => setSortCol(c => { setSortDir(c === col ? d => d * -1 : () => 1); return col; });

  const withScores = rows.map(r => ({ ...r, _special: getSpecial(r.mileTime), score: calcScore(r.mileTime, r.ttb) }));
  const sorted = [...withScores].sort((a, b) => {
    let av = a[sortCol] ?? "", bv = b[sortCol] ?? "";
    if (sortCol === "rollCall") { av = parseInt(av) || 0; bv = parseInt(bv) || 0; }
    if (sortCol === "score")   { av = a.score ?? -1; bv = b.score ?? -1; }
    return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
  });

  const graded  = withScores.filter(r => r.score !== null);
  const special = withScores.filter(r => r._special);
  const avg     = graded.length ? Math.round(graded.reduce((s, r) => s + r.score, 0) / graded.length) : null;
  const dist    = [100, 90, 80, 70, 65, 50].map(s => [s, graded.filter(r => r.score === s).length]);

  const SortArrow = ({ col }) => <span style={{ opacity: sortCol === col ? 1 : 0.3, fontSize: 10, marginLeft: 3 }}>{sortCol === col && sortDir === -1 ? "▼" : "▲"}</span>;
  const Th = ({ col, children, center }) => <th onClick={() => handleSort(col)} style={{ cursor: "pointer", textAlign: center ? "center" : "left", userSelect: "none" }}>{children}<SortArrow col={col} /></th>;

  if (!ready) return <div style={{ padding: "3rem", textAlign: "center" }}>Loading gradebook…</div>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .gb { font-family: 'IBM Plex Sans', sans-serif; background: #e8f0fe; min-height: 100vh; }
        .gb-head { background: #0c1527; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        .gb-head-left { display: flex; align-items: center; gap: 12px; }
        .gb-logo { width: 34px; height: 34px; border-radius: 8px; background: #1d4ed8; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .gb-title { margin: 0; font-size: 16px; font-weight: 600; color: #f1f5f9; }
        .gb-class-input { background: rgba(255,255,255,0.08); border: 0.5px solid rgba(255,255,255,0.15); color: #cbd5e1; font-family: inherit; font-size: 13px; padding: 4px 10px; border-radius: 6px; width: 130px; }
        .gb-class-input:focus { outline: none; border-color: #3b82f6; }
        .gb-actions { display: flex; gap: 7px; flex-wrap: wrap; }
        .btn { font-family: inherit; font-size: 12.5px; font-weight: 500; padding: 6px 13px; border-radius: 6px; cursor: pointer; border: none; transition: all 0.12s; white-space: nowrap; }
        .btn-ghost { background: rgba(255,255,255,0.07); color: #e2e8f0; } .btn-ghost:hover { background: rgba(255,255,255,0.13); }
        .btn-blue  { background: #1d4ed8; color: #fff; } .btn-blue:hover  { background: #1e40af; }
        .btn-green { background: #15803d; color: #fff; } .btn-green:hover { background: #166534; }
        .btn-red   { background: rgba(239,68,68,0.12); color: #fca5a5; } .btn-red:hover { background: rgba(239,68,68,0.22); }
        .btn-danger { font-family: inherit; font-size: 12.5px; font-weight: 500; padding: 6px 13px; border-radius: 6px; cursor: pointer; border: none; background: #dc2626; color: #fff; } .btn-danger:hover { background: #b91c1c; }
        .gb-stats { display: flex; border-bottom: 1px solid #c7d7f5; overflow-x: auto; background: #dce8fb; }
        .gb-stat { padding: 10px 16px; flex-shrink: 0; border-right: 1px solid #c7d7f5; }
        .gb-stat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: #5a7ab0; margin: 0 0 2px; font-weight: 500; }
        .gb-stat-val { font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 500; color: #1e3a5f; margin: 0; }
        .gb-legend { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 16px; border-bottom: 1px solid #c7d7f5; background: #eaf1fe; }
        .legend-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: #3d5a8a; }
        .legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .gb-scroll { overflow-x: auto; background: #fff; }
        table.gt { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        table.gt thead th { padding: 8px 10px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #4a6fa5; border-bottom: 1px solid #c7d7f5; background: #dce8fb; white-space: nowrap; position: sticky; top: 0; z-index: 2; }
        table.gt tbody td { padding: 1px 6px; border-bottom: 1px solid #e8f0fe; }
        table.gt tbody tr:last-child td { border-bottom: none; }
        table.gt tbody tr:hover { background: #f0f5ff; }
        .ci { width: 100%; border: none; background: transparent; font-family: inherit; font-size: 13.5px; color: #1e3a5f; padding: 6px 5px; border-radius: 4px; outline: none; }
        .ci:focus { background: #dbeafe; outline: 1.5px solid #3b82f6; }
        .ci.mono { font-family: 'IBM Plex Mono', monospace; text-align: center; }
        .score-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; height: 26px; border-radius: 6px; font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 500; }
        .special-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 42px; height: 22px; border-radius: 5px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 500; }
        .score-bar { width: 42px; height: 4px; border-radius: 2px; background: #c7d7f5; overflow: hidden; margin-top: 2px; }
        .score-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
        .del-btn { border: none; background: none; cursor: pointer; color: #7a9cc5; font-size: 17px; line-height: 1; padding: 2px 7px; border-radius: 4px; }
        .del-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
        .add-row td { padding: 6px 10px; }
        .add-row-btn { font-family: inherit; font-size: 12.5px; color: #7a9cc5; background: none; border: 1.5px dashed #c7d7f5; border-radius: 6px; padding: 5px 14px; cursor: pointer; width: 100%; }
        .add-row-btn:hover { color: #3b82f6; border-color: #3b82f6; }
        .hint { font-size: 11px; color: #5a7ab0; padding: 8px 16px 12px; }
        .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; font-family: inherit; z-index: 9999; box-shadow: 0 4px 24px rgba(0,0,0,0.18); animation: slideUp 0.25s ease; }
        @keyframes slideUp { from { transform: translateX(-50%) translateY(10px); opacity:0; } to { transform: translateX(-50%) translateY(0); opacity:1; } }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9998; }
        .modal-box { background: #fff; border: 1px solid #c7d7f5; border-radius: 12px; padding: 24px; }
        .modal-title { margin: 0 0 6px; font-weight: 600; font-size: 15px; color: #1e3a5f; }
        .modal-body  { margin: 0 0 20px; font-size: 13px; color: #4a6fa5; }
        .modal-footer { display: flex; gap: 8px; justify-content: flex-end; }
      `}</style>

      <div className="gb">
        <div className="gb-head">
          <div className="gb-head-left">
            <div className="gb-logo">🏃</div>
            <h1 className="gb-title">Mile Run Gradebook</h1>
            <input className="gb-class-input" value={className} onChange={e => setClassName(e.target.value)} placeholder="Class / Period" />
          </div>
          <div className="gb-actions">
            <button className="btn btn-blue" onClick={() => fileRef.current.click()}>↑ Import CSV / XLSX</button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={handleFile} />
            <button className="btn btn-green" onClick={exportCSV}>↓ Export CSV</button>
            <button className="btn btn-ghost" onClick={addRow}>+ Add student</button>
            <button className="btn btn-red" onClick={clearAll}>Clear all</button>
          </div>
        </div>

        <div className="gb-stats">
          <div className="gb-stat"><p className="gb-stat-lbl">Students</p><p className="gb-stat-val">{rows.length}</p></div>
          <div className="gb-stat"><p className="gb-stat-lbl">Graded</p><p className="gb-stat-val">{graded.length}</p></div>
          {special.length > 0 && <div className="gb-stat"><p className="gb-stat-lbl">MU / Med</p><p className="gb-stat-val">{special.length}</p></div>}
          <div className="gb-stat"><p className="gb-stat-lbl">Class avg</p><p className="gb-stat-val">{avg ?? "—"}</p></div>
          {dist.map(([s, cnt]) => (
            <div className="gb-stat" key={s} style={{ borderTop: `3px solid ${SCORE_CFG[s].bar}` }}>
              <p className="gb-stat-lbl" style={{ color: SCORE_CFG[s].bar }}>{s}s</p>
              <p className="gb-stat-val">{cnt}</p>
            </div>
          ))}
        </div>

        <div className="gb-legend">
          {Object.entries(SCORE_CFG).map(([s, c]) => (
            <span className="legend-chip" key={s}>
              <span className="legend-dot" style={{ background: c.bar }} />
              <strong style={{ color: "#1e3a5f" }}>{s}</strong> {c.label}
            </span>
          ))}
          <span className="legend-chip" style={{ marginLeft: 8 }}>
            <span className="legend-dot" style={{ background: "#d97706" }} />
            <strong style={{ color: "#1e3a5f" }}>MU</strong> Make-Up &nbsp;
            <span className="legend-dot" style={{ background: "#16a34a" }} />
            <strong style={{ color: "#1e3a5f" }}>MED</strong> Medical
          </span>
        </div>

        <div className="gb-scroll">
          <table className="gt">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <Th col="rollCall" center>Roll</Th>
                <Th col="studentId">Student ID</Th>
                <Th col="lastName">Last Name</Th>
                <Th col="firstName">First Name</Th>
                <Th col="ttb" center>Time to Beat</Th>
                <Th col="mileTime" center>Mile Time</Th>
                <Th col="score" center>Score</Th>
                <th style={{ width: 34 }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => {
                const sc = row.score, cfg = sc !== null ? SCORE_CFG[sc] : null, sp = row._special;
                return (
                  <tr key={row.id}>
                    <td style={{ textAlign: "center", color: "#7a9cc5", fontSize: 11, fontFamily: "'IBM Plex Mono',monospace" }}>{i + 1}</td>
                    <td style={{ width: 62 }}><input className="ci mono" value={row.rollCall}  onChange={e => update(row.id, "rollCall",  e.target.value)} placeholder="#" /></td>
                    <td style={{ width: 105 }}><input className="ci mono" value={row.studentId} onChange={e => update(row.id, "studentId", e.target.value)} placeholder="ID" /></td>
                    <td style={{ width: 130 }}><input className="ci"      value={row.lastName}  onChange={e => update(row.id, "lastName",  e.target.value)} placeholder="Last name" /></td>
                    <td style={{ width: 130 }}><input className="ci"      value={row.firstName} onChange={e => update(row.id, "firstName", e.target.value)} placeholder="First name" /></td>
                    <td style={{ width: 110 }}><input className="ci mono" value={row.ttb}       onChange={e => update(row.id, "ttb",       e.target.value)} placeholder="MM.SS" /></td>
                    <td style={{ width: 110 }}><input className="ci mono" value={row.mileTime}  onChange={e => update(row.id, "mileTime",  e.target.value)} placeholder="MM.SS or MU/MED" /></td>
                    <td style={{ width: 80, textAlign: "center" }}>
                      {sp ? (
                        <span className="special-badge" style={{ background: sp.bg, color: sp.fg }} title={sp.title}>{sp.label}</span>
                      ) : cfg ? (
                        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <span className="score-badge" style={{ background: cfg.bg, color: cfg.fg }}>{sc}</span>
                          <div className="score-bar"><div className="score-bar-fill" style={{ width: `${sc}%`, background: cfg.bar }} /></div>
                        </div>
                      ) : <span style={{ color: "#7a9cc5", fontSize: 13 }}>—</span>}
                    </td>
                    <td><button className="del-btn" onClick={() => delRow(row.id)}>×</button></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="add-row"><td colSpan={9}><button className="add-row-btn" onClick={addRow}>+ Add student row</button></td></tr>
            </tfoot>
          </table>
        </div>

        <p className="hint">
          Times: enter as <strong>MM.SS</strong> (e.g. <code>10.59</code> = 10:59 · <code>8.07</code> = 8:07) · Type <strong>MU</strong> for make-up, <strong>MED</strong> for medical · Click column headers to sort · Data auto-saves
        </p>
      </div>

      {toast && (
        <div className="toast" style={{ background: toast.ok ? "#0c1527" : "#7f1d1d", color: toast.ok ? "#f1f5f9" : "#fecaca" }}>
          {toast.ok ? "✓ " : "⚠ "}{toast.msg}
        </div>
      )}

      {confirmOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ width: "min(380px,90vw)" }}>
            <p className="modal-title">Clear all student data?</p>
            <p className="modal-body">This will delete every row and start a fresh sheet. This cannot be undone.</p>
            <div className="modal-footer">
              <button className="btn btn-ghost" style={{ background: "#e2e8f0", color: "#1e3a5f" }} onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="btn-danger" onClick={confirmClear}>Yes, clear all</button>
            </div>
          </div>
        </div>
      )}

      {csvModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCsvModal(null); }}>
          <div className="modal-box" style={{ width: "min(580px,92vw)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p className="modal-title" style={{ marginBottom: 2 }}>Export ready — {csvModal.fileName}</p>
                <p style={{ margin: 0, fontSize: 12, color: "#5a7ab0" }}>If the download didn't start, copy below and paste into a .csv file</p>
              </div>
              <button onClick={() => setCsvModal(null)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#7a9cc5", padding: "0 4px" }}>×</button>
            </div>
            <textarea readOnly value={csvModal.csv} onClick={e => e.target.select()}
              style={{ width: "100%", height: 180, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, padding: "10px 12px", background: "#f0f5ff", border: "1px solid #c7d7f5", borderRadius: 8, color: "#1e3a5f", resize: "none", outline: "none" }} />
            <div className="modal-footer" style={{ marginTop: 12 }}>
              <button className="btn btn-ghost" style={{ background: "#e2e8f0", color: "#1e3a5f", fontSize: 13 }}
                onClick={() => navigator.clipboard.writeText(csvModal.csv).then(() => showToast("Copied to clipboard"))}>
                Copy to clipboard
              </button>
              <button className="btn btn-green" style={{ fontSize: 13 }}
                onClick={() => { const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvModal.csv); a.download = csvModal.fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}>
                ↓ Download again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
