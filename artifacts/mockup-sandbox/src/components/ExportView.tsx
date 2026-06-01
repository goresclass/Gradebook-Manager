import React, { useMemo } from "react";
import { ArrowLeft, FileText, Copy, Download, Archive } from "lucide-react";
import * as XLSX from "xlsx";
import { useGradebook } from "../contexts/GradebookContext";
import { useSettings } from "../contexts/SettingsContext";
import { calcScore, getSpecial, SCORE_CFG } from "../utils/grading";

export function ExportView({ onBack }: { onBack: () => void }) {
  const { rows, className, stats, classes } = useGradebook();
  const { gradingConfig } = useSettings();

  const csv = useMemo(() => {
    const headers = ["Student ID", "Roll Call", "Last Name", "First Name", "Time to Beat", "Mile Time", "Score"];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const dataRows = rows.map(r => {
      const score = calcScore(r.mileTime, r.ttb, gradingConfig);
      const sp = getSpecial(r.mileTime, gradingConfig);
      const sv = sp ? "Na" : (score !== null ? score : "");
      return [r.studentId, r.rollCall, r.lastName, r.firstName, r.ttb, r.mileTime, sv].map(escape).join(",");
    });
    return [headers.map(escape).join(","), ...dataRows].join("\n");
  }, [rows, gradingConfig]);

  const safeName = (className || "gradebook").replace(/[^a-z0-9]/gi, "_").toLowerCase();

  const handleExcelExport = () => {
    try {
      const headerRow = ["Student ID", "Roll Call", "Last Name", "First Name", "Time to Beat", "Mile Time", "Score"];
      const dataRows = rows.map(r => {
        const score = calcScore(r.mileTime, r.ttb, gradingConfig);
        const sp = getSpecial(r.mileTime, gradingConfig);
        const sv = sp ? "Na" : (score !== null ? score : "");
        return [r.studentId, r.rollCall, r.lastName, r.firstName, r.ttb, r.mileTime, sv];
      });
      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
      ws["!cols"] = [{ wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 8 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, className || "Grades");
      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}_grades.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export Failed: ${e instanceof Error ? e.message : "Could not generate the Excel file."}`);
    }
  };

  const handleCopyCSV = async () => {
    try {
      await navigator.clipboard.writeText(csv);
      alert("Copied: CSV data copied to clipboard. Paste into a spreadsheet app to open.");
    } catch {
      alert("Copy failed. Please try the download option instead.");
    }
  };

  const handleDownloadCSV = () => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}_grades.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleHistoryExport = () => {
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = ["Class", "Roll Call", "Last Name", "First Name", "Student ID", "Run Date", "Mile Time", "Score"];
    const dataRows: string[] = [];

    for (const cls of classes) {
      for (const r of cls.rows) {
        if (!r.runs?.length) continue;
        for (const run of r.runs) {
          dataRows.push([cls.name, r.rollCall, r.lastName, r.firstName, r.studentId, run.label, run.mileTime, run.score ?? ""].map(escape).join(","));
        }
      }
    }

    if (!dataRows.length) { alert("No History: Archive some runs first before exporting history."); return; }

    const csvData = [headers.map(escape).join(","), ...dataRows].join("\n");
    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `run_history_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const actions = [
    {
      icon: <FileText size={18} className="text-green-700" />,
      iconBg: "bg-green-100 dark:bg-green-900",
      label: "Export as Excel (.xlsx)",
      desc: "Real Excel file — upload directly to Aeries gradebook",
      badge: "Aeries",
      onClick: handleExcelExport,
    },
    {
      icon: <Copy size={18} className="text-blue-700" />,
      iconBg: "bg-blue-100 dark:bg-blue-900",
      label: "Copy CSV to Clipboard",
      desc: "Paste into Google Sheets or Numbers",
      onClick: handleCopyCSV,
    },
    {
      icon: <Download size={18} className="text-yellow-700" />,
      iconBg: "bg-yellow-100 dark:bg-yellow-900",
      label: "Download CSV File",
      desc: "Download to your computer",
      onClick: handleDownloadCSV,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#0c1527] px-4 pb-3 pt-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
          <ArrowLeft size={20} className="text-slate-100" />
        </button>
        <p className="flex-1 text-center text-[17px] font-semibold text-slate-100 mr-8">Export Grades</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {/* Summary */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-base font-bold text-foreground">{className || "Gradebook"}</p>
          <p className="text-sm text-muted-foreground">
            {stats.total} students · {stats.graded} graded · Class avg: {stats.avg ?? "—"}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {stats.dist.map(([s, cnt]) =>
              cnt > 0 ? (
                <span key={s} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${SCORE_CFG[s]?.bgClass} ${SCORE_CFG[s]?.fgClass}`}>
                  {s} ×{cnt}
                </span>
              ) : null
            )}
          </div>
        </div>

        {/* Export Options */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-3.5 pb-2">Export Options</p>
          {actions.map((act, i) => (
            <button
              key={i}
              onClick={act.onClick}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-t border-border hover:bg-secondary transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${act.iconBg}`}>
                {act.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{act.label}</p>
                  {act.badge && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-green-600 text-white">{act.badge}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{act.desc}</p>
              </div>
              <span className="text-muted-foreground flex-shrink-0">›</span>
            </button>
          ))}
        </div>

        {/* Semester Records */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-3.5 pb-2">Semester Records</p>
          <button
            onClick={handleHistoryExport}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-t border-border hover:bg-secondary transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-100 dark:bg-purple-900">
              <Archive size={18} className="text-purple-700 dark:text-purple-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Export All Run History</p>
              <p className="text-xs text-muted-foreground mt-0.5">Every archived run across all periods — one row per entry</p>
            </div>
            <span className="text-muted-foreground">›</span>
          </button>
        </div>

        {/* CSV Preview */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">CSV Preview</p>
          <pre className="text-xs font-mono text-foreground leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
            {csv.split("\n").slice(0, 20).join("\n")}
            {csv.split("\n").length > 20 ? "\n…" : ""}
          </pre>
        </div>

        {/* Score legend */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Score Reference</p>
          {Object.entries(SCORE_CFG).map(([s, cfg]) => (
            <div key={s} className="flex items-center gap-2.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${cfg.barClass}`} />
              <span className="text-sm font-bold text-foreground w-8">{s}</span>
              <span className="text-sm text-muted-foreground">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
