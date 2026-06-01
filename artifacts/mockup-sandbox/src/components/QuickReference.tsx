import { BookOpen, Info } from "lucide-react";

const SCORE_COLORS: Record<string, string> = {
  "100": "text-green-500",
  "90":  "text-blue-500",
  "80":  "text-sky-500",
  "70":  "text-yellow-500",
  "65":  "text-orange-500",
  "50":  "text-red-500",
};

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="px-3.5 py-2 rounded-lg bg-[#0c1527] mt-4 mb-1">
      <span className="text-xs font-bold text-slate-100 tracking-wide">{icon}  {title}</span>
    </div>
  );
}

function Table({ headers, rows, colFlex }: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
  colFlex?: number[];
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden mb-1">
      <div className="flex bg-secondary">
        {headers.map((h, i) => (
          <span key={i} className={`text-xs font-bold uppercase tracking-wide text-muted-foreground px-2.5 py-2.5 ${colFlex ? `flex-[${colFlex[i] ?? 1}]` : "flex-1"}`}>{h}</span>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} className="flex border-t border-border">
          {row.map((cell, ci) => (
            <span key={ci} className={`text-xs px-2.5 py-2 leading-relaxed text-foreground ${ci === 0 ? "font-semibold" : "text-muted-foreground"} ${colFlex ? `flex-[${colFlex[ci] ?? 1}]` : "flex-1"}`}>
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Note({ text }: { text: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-secondary p-2.5 mb-1">
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function SettingsBlock({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-3 space-y-1.5">
      <p className="text-xs font-bold text-foreground">{icon}  {title}</p>
      {children}
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-primary font-bold text-sm leading-5">•</span>
      <p className="text-sm text-foreground leading-5">{text}</p>
    </div>
  );
}

export function QuickReference() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#0c1527] px-4 pb-3 pt-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <BookOpen size={18} className="text-white" />
        </div>
        <div>
          <p className="text-[17px] font-bold text-slate-100">Quick Reference</p>
          <p className="text-xs text-slate-400">Mile Run Grader</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 pb-24">
        {/* Time format callout */}
        <div className="rounded-xl border-l-4 border-primary bg-card p-3.5 mb-3">
          <p className="text-xs font-bold uppercase tracking-wide text-primary mb-1">Time Format → MM.SS</p>
          <p className="text-sm text-foreground">
            <code className="font-mono font-semibold">10.59</code> = 10:59
            {"   ·   "}
            <code className="font-mono font-semibold">8.07</code> = 8:07
          </p>
        </div>

        {/* Navigation note */}
        <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary p-2.5 mb-3">
          <Info size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Use the bottom tab bar to switch between <strong className="text-foreground">Gradebook</strong>,{" "}
            <strong className="text-foreground">Quick Reference</strong>, and{" "}
            <strong className="text-foreground">Settings</strong>.
            Manage multiple class periods from the Gradebook tab. Grading thresholds, status labels,
            and app theme can be customized in Settings.
          </p>
        </div>

        {/* Grading Parameters */}
        <SectionHeader icon="📊" title="GRADING PARAMETERS" />
        <Note text="Default thresholds shown. Adjust in Settings ⚙ — asterisked (*) values are customizable." />
        <Table
          headers={["Score", "Condition", "Notes"]}
          colFlex={[0.55, 1.1, 1.35]}
          rows={[
            [<span key="100" className={`font-bold ${SCORE_COLORS["100"]}`}>100</span>, "Mile ≤ TTB", "Beat benchmark"],
            [<span key="90" className={`font-bold ${SCORE_COLORS["90"]}`}>90</span>, "≤ 10s* over TTB", "Very close"],
            [<span key="80" className={`font-bold ${SCORE_COLORS["80"]}`}>80</span>, "≤ 29s* over TTB", "Close to TTB"],
            [<span key="70" className={`font-bold ${SCORE_COLORS["70"]}`}>70</span>, "30s+ over TTB (under 12:00*)", "Sub-12 min"],
            [<span key="65" className={`font-bold ${SCORE_COLORS["65"]}`}>65</span>, "12:00*–15:59* (TTB ignored)", "Time overrides"],
            [<span key="50" className={`font-bold ${SCORE_COLORS["50"]}`}>50</span>, "≥ 16:00* (TTB ignored)", "Slowest tier"],
          ]}
        />
        <Note text="* Customizable in Settings. If no TTB is set, only absolute time cutoffs apply (65, 50, or 70)." />

        {/* Special Status Codes */}
        <SectionHeader icon="🏷" title="SPECIAL STATUS CODES" />
        <Table
          headers={["Code", "When to Use"]}
          colFlex={[1, 1.8]}
          rows={[
            ["MU  —  Make-Up*", "Needs a make-up run"],
            ["MED  —  Medical*", "Medical excuse on file"],
            ["ABS  —  Absent*", "Student was absent"],
            ["EXC  —  Excused*", "Excused exemption"],
          ]}
        />
        <Note text={<>Enter codes in the Mile Time column. Students with special codes are excluded from the class average.{"\n"}* Display labels are customizable in Settings — the codes (MU, MED, ABS, EXC) themselves never change.</>} />

        {/* Class Periods */}
        <SectionHeader icon="🗂" title="CLASS PERIODS" />
        <Table
          headers={["Action", "How"]}
          colFlex={[1, 1.8]}
          rows={[
            ["Add period", "Tap + in the period switcher at the top of Gradebook"],
            ["Rename period", "Tap the period name to edit it inline"],
            ["Switch period", "Tap any period tab in the switcher"],
            ["Delete period", "Click X on the period chip, then confirm"],
            ["Move student", "Open student detail → tap the ↱ icon → choose destination period"],
            ["Search all periods", "Tap the 🌐 globe icon next to the search bar, then type a name or ID"],
          ]}
        />

        {/* Archiving Runs */}
        <SectionHeader icon="📦" title="ARCHIVING RUNS" />
        <div className="rounded-xl border border-border bg-card overflow-hidden mb-1">
          <SettingsBlock icon="📷" title="Archive This Run Cycle">
            <p className="text-xs text-muted-foreground leading-relaxed">Found in the Gradebook toolbar (teal icon). Snapshots every student's current mile time into their run history, then clears the Mile Time column so the class is ready for the next run cycle.</p>
            <p className="text-xs text-foreground"><strong>TTB is preserved</strong> — Personal benchmarks are never cleared</p>
            <p className="text-xs text-foreground"><strong>History per student</strong> — View all past runs on the student detail screen</p>
          </SettingsBlock>
          <div className="h-px bg-border" />
          <SettingsBlock icon="📅" title="Edit Archive Dates">
            <p className="text-xs text-muted-foreground leading-relaxed">After archiving at least one run, tap the archive button again and choose "Edit Archive Dates" to bulk-rename any run date label across all students in the period at once.</p>
          </SettingsBlock>
          <div className="h-px bg-border" />
          <SettingsBlock icon="➕" title="Add Run Manually">
            <p className="text-xs text-muted-foreground leading-relaxed">On any student's detail screen, tap "+ Add Run" in the Run History section to backfill a past run entry. Useful for transfer students who have prior run data.</p>
          </SettingsBlock>
        </div>

        {/* Export Screen */}
        <SectionHeader icon="↓" title="EXPORT SCREEN" />
        <Table
          headers={["Option", "What You Get"]}
          colFlex={[1, 1.8]}
          rows={[
            ["Export as Excel (.xlsx)", "Real .xlsx file — upload directly to Aeries"],
            ["Copy CSV to Clipboard", "Paste into Google Sheets or Numbers"],
            ["Download CSV File", "Download CSV to your computer"],
            ["Export All Run History", "Every archived run across all periods, one row per entry"],
          ]}
        />

        {/* Import headers */}
        <SectionHeader icon="📥" title="IMPORT — ACCEPTED HEADERS" />
        <Table
          headers={["Field", "Accepted Column Names"]}
          colFlex={[1, 1.8]}
          rows={[
            ["Student ID", "studentid, id, student_id"],
            ["Roll Call", "rollcall, roll, number, #"],
            ["Last Name", "lastname, last, surname"],
            ["First Name", "firstname, first, given"],
            ["Time to Beat", "timetobeat, ttb, goal"],
            ["Mile Time", "miletime, mile, time, runtime"],
            ["Photo URL", "photo, photo_url, image, picture, pic"],
          ]}
        />

        {/* Column Guide */}
        <SectionHeader icon="📋" title="COLUMN GUIDE" />
        <Table
          headers={["Column", "Notes"]}
          colFlex={[1, 1.8]}
          rows={[
            ["Roll", "Roll # — sorts numerically"],
            ["Student ID", "Included in CSV export"],
            ["Last / First", "Student name fields"],
            ["Photo", "URL for student photo (circular avatar with initials fallback)"],
            ["Time to Beat", "Personal benchmark in MM.SS — preserved across archives"],
            ["Mile Time", "Run time MM.SS or a status code; cleared on archive"],
            ["Score", "Auto-calculated — read only"],
          ]}
        />

        {/* Tips */}
        <SectionHeader icon="💡" title="TIPS & REMINDERS" />
        <div className="rounded-xl border border-border bg-card p-4 mb-1 space-y-3">
          <Tip text="Data saves automatically — no need to tap Save." />
          <Tip text="Tap any column header to sort; tap again to reverse." />
          <Tip text="Archive runs at the end of each run cycle — it clears times but keeps TTB." />
          <Tip text="View a student's full run history by tapping their card." />
          <Tip text="Seconds must be 00–59 (e.g. 10.60 is not valid)." />
          <Tip text="Use Cloud Sync to move data between devices." />
          <Tip text="Export Run History at the end of a semester for a permanent record of all runs." />
          <Tip text="Student photos load from any public URL — add a photo column to your import CSV." />
          <Tip text="Use the 🌐 globe icon to find a student across all periods without switching tabs." />
          <Tip text='Special codes (MU, MED, ABS, EXC) export as "Na" — exactly what Aeries expects.' />
          <Tip text="Import 'Mile Times Only' to update just run times without overwriting your roster." />
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Scores auto-calculate on every keystroke · Archive runs between cycles · Sync across devices · Customize everything in ⚙ Settings
          </p>
        </div>
      </div>
    </div>
  );
}

import React from "react";
