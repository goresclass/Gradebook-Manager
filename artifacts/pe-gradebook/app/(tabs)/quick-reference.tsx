import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Colors = Record<string, string>;

function SectionHeader({ icon, title, colors }: { icon: string; title: string; colors: Colors }) {
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.header }]}>
      <Text style={styles.sectionHeaderText}>{icon}  {title}</Text>
    </View>
  );
}

const SCORE_FLEX = [0.55, 1.1, 1.35];

function ScoreTableHeader({ cols, colors }: { cols: string[]; colors: Colors }) {
  return (
    <View style={[styles.row, styles.tableHead, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      {cols.map((c, i) => (
        <Text key={i} style={[styles.cell, styles.headCell, { color: colors.mutedForeground, flex: SCORE_FLEX[i] ?? 1 }]}>{c}</Text>
      ))}
    </View>
  );
}

function ScoreTableRow({ cols, colors, accent }: { cols: string[]; colors: Colors; accent?: string }) {
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      {cols.map((c, i) => (
        <Text key={i} style={[
          styles.cell,
          { color: accent && i === 0 ? accent : colors.foreground, flex: SCORE_FLEX[i] ?? 1 },
          i === 0 && styles.centerCell,
        ]}>{c}</Text>
      ))}
    </View>
  );
}

function TwoColRow({ col1, col2, colors }: { col1: string; col2: string; colors: Colors }) {
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <Text style={[styles.cell, styles.bold, { color: colors.foreground, flex: 1 }]}>{col1}</Text>
      <Text style={[styles.cell, { color: colors.mutedForeground, flex: 1.8 }]}>{col2}</Text>
    </View>
  );
}

function TwoColHeader({ col1, col2, colors }: { col1: string; col2: string; colors: Colors }) {
  return (
    <View style={[styles.row, styles.tableHead, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={[styles.cell, styles.headCell, { color: colors.mutedForeground, flex: 1 }]}>{col1}</Text>
      <Text style={[styles.cell, styles.headCell, { color: colors.mutedForeground, flex: 1.8 }]}>{col2}</Text>
    </View>
  );
}

function ThreeColHeader({ cols, colors }: { cols: string[]; colors: Colors }) {
  return (
    <View style={[styles.row, styles.tableHead, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      {cols.map((c, i) => (
        <Text key={i} style={[styles.cell, styles.headCell, { color: colors.mutedForeground, flex: 1 }]}>{c}</Text>
      ))}
    </View>
  );
}

function ThreeColRow({ cols, colors }: { cols: string[]; colors: Colors }) {
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      {cols.map((c, i) => (
        <Text key={i} style={[styles.cell, { color: i === 0 ? colors.foreground : colors.mutedForeground, flex: 1, fontWeight: i === 0 ? "600" : "400" }]}>{c}</Text>
      ))}
    </View>
  );
}

function Tip({ text, colors }: { text: string; colors: Colors }) {
  return (
    <View style={styles.tipRow}>
      <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
      <Text style={[styles.tipText, { color: colors.foreground }]}>{text}</Text>
    </View>
  );
}

function SettingsBlock({ icon, title, body, colors }: { icon: string; title: string; body: React.ReactNode; colors: Colors }) {
  return (
    <View style={[styles.settingsBlock, { borderColor: colors.border }]}>
      <Text style={[styles.settingsBlockTitle, { color: colors.foreground }]}>{icon}  {title}</Text>
      {body}
    </View>
  );
}

export default function QuickReferenceScreen() {
  const colors = useColors() as Colors;
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 80);
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const scoreBadgeColors: Record<string, string> = {
    "100": colors.score100bar ?? "#22c55e",
    "90":  colors.score90bar  ?? "#84cc16",
    "80":  colors.score80bar  ?? "#eab308",
    "70":  colors.score70bar  ?? "#f97316",
    "65":  colors.score65bar  ?? "#ef4444",
    "50":  colors.score50bar  ?? "#dc2626",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: topPad + 14 }]}>
        <View style={[styles.headerLogo, { backgroundColor: colors.primary }]}>
          <Feather name="book-open" size={18} color="#fff" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Quick Reference</Text>
          <Text style={styles.headerSub}>Mile Run Grader</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Time Format callout */}
        <View style={[styles.callout, { backgroundColor: colors.card, borderColor: colors.primary, borderLeftWidth: 4 }]}>
          <Text style={[styles.calloutTitle, { color: colors.primary }]}>Time Format  →  MM.SS</Text>
          <Text style={[styles.calloutBody, { color: colors.foreground }]}>
            <Text style={styles.mono}>10.59</Text> = 10:59{"   ·   "}<Text style={styles.mono}>8.07</Text> = 8:07
          </Text>
        </View>

        {/* Navigation note */}
        <View style={[styles.navNote, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="info" size={13} color={colors.mutedForeground} style={{ marginTop: 1 }} />
          <Text style={[styles.navNoteText, { color: colors.mutedForeground }]}>
            Use the bottom tab bar to switch between <Text style={{ color: colors.foreground, fontWeight: "600" }}>Gradebook</Text>,{" "}
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>Quick Reference</Text>, and{" "}
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>Settings</Text>.
            Grading thresholds and status labels can be customized in Settings.
          </Text>
        </View>

        {/* Grading Parameters */}
        <SectionHeader icon="📊" title="GRADING PARAMETERS" colors={colors} />
        <View style={[styles.note, { backgroundColor: colors.secondary, borderColor: colors.border, marginBottom: 2 }]}>
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            Default thresholds shown. Adjust in Settings ⚙ — asterisked (*) values are customizable.
          </Text>
        </View>
        <View style={[styles.table, { borderColor: colors.border }]}>
          <ScoreTableHeader cols={["Score", "Condition", "Notes"]} colors={colors} />
          <ScoreTableRow cols={["100", "Mile ≤ TTB",                    "Beat benchmark"          ]} colors={colors} accent={scoreBadgeColors["100"]} />
          <ScoreTableRow cols={["90",  "≤ 10s* over TTB",              "Very close"               ]} colors={colors} accent={scoreBadgeColors["90"]}  />
          <ScoreTableRow cols={["80",  "≤ 29s* over TTB",              "Close to TTB"             ]} colors={colors} accent={scoreBadgeColors["80"]}  />
          <ScoreTableRow cols={["70",  "30s+ over TTB (under 12:00*)", "Sub-12 min"               ]} colors={colors} accent={scoreBadgeColors["70"]}  />
          <ScoreTableRow cols={["65",  "12:00*–15:59* (TTB ignored)",  "Time overrides"           ]} colors={colors} accent={scoreBadgeColors["65"]}  />
          <ScoreTableRow cols={["50",  "≥ 16:00* (TTB ignored)",       "Slowest tier"             ]} colors={colors} accent={scoreBadgeColors["50"]}  />
        </View>
        <View style={[styles.note, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            * Customizable in Settings. If no TTB is set, only absolute time cutoffs apply (65, 50, or 70).
          </Text>
        </View>

        {/* Special Status Codes */}
        <SectionHeader icon="🏷" title="SPECIAL STATUS CODES" colors={colors} />
        <View style={[styles.table, { borderColor: colors.border }]}>
          <TwoColHeader col1="Code" col2="When to Use" colors={colors} />
          <TwoColRow col1="MU  —  Make-Up*"  col2="Needs a make-up run" colors={colors} />
          <TwoColRow col1="MED  —  Medical*" col2="Medical excuse on file" colors={colors} />
          <TwoColRow col1="ABS  —  Absent*"  col2="Student was absent" colors={colors} />
          <TwoColRow col1="EXC  —  Excused*" col2="Excused exemption" colors={colors} />
        </View>
        <View style={[styles.note, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            Enter codes in the Mile Time column. Students with special codes are excluded from the class average.{"\n"}
            * Display labels are customizable in Settings — the codes (MU, MED, ABS, EXC) themselves never change.
          </Text>
        </View>

        {/* Toolbar Buttons */}
        <SectionHeader icon="🖱" title="TOOLBAR BUTTONS" colors={colors} />
        <View style={[styles.table, { borderColor: colors.border }]}>
          <TwoColHeader col1="Button" col2="What It Does" colors={colors} />
          <TwoColRow col1="↑ Import CSV/XLSX"  col2="Load a roster or data file" colors={colors} />
          <TwoColRow col1="↓ Export CSV"       col2="Download grades as a spreadsheet" colors={colors} />
          <TwoColRow col1="+ Add Student"      col2="Append a blank row to the list" colors={colors} />
          <TwoColRow col1="Clear All"          col2="Wipe sheet and start fresh (confirms first)" colors={colors} />
          <TwoColRow col1="Class / Period"     col2="Sets the export filename" colors={colors} />
        </View>

        {/* Column Guide */}
        <SectionHeader icon="📋" title="COLUMN GUIDE" colors={colors} />
        <View style={[styles.table, { borderColor: colors.border }]}>
          <TwoColHeader col1="Column" col2="Notes" colors={colors} />
          <TwoColRow col1="Roll"           col2="Roll # — sorts numerically" colors={colors} />
          <TwoColRow col1="Student ID"     col2="Included in CSV export" colors={colors} />
          <TwoColRow col1="Last / First"   col2="Student name fields" colors={colors} />
          <TwoColRow col1="Time to Beat"   col2="Personal benchmark in MM.SS" colors={colors} />
          <TwoColRow col1="Mile Time"      col2="Run time MM.SS or a status code" colors={colors} />
          <TwoColRow col1="Score"          col2="Auto-calculated — read only" colors={colors} />
        </View>

        {/* Settings Screen */}
        <SectionHeader icon="⚙" title="SETTINGS SCREEN" colors={colors} />
        <View style={[styles.note, { backgroundColor: colors.secondary, borderColor: colors.border, marginBottom: 2 }]}>
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            Access Settings from the bottom tab bar. All changes apply immediately.
          </Text>
        </View>
        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsBlock
            icon="🎯"
            title="TTB-Based Scoring"
            colors={colors}
            body={
              <>
                <Text style={[styles.settingsLine, { color: colors.mutedForeground }]}>
                  Applies when a student has a TTB and their time is under the 65-point cutoff.
                </Text>
                <Text style={[styles.settingsBullet, { color: colors.foreground }]}>
                  <Text style={styles.bold}>90-point tier</Text>{"  "}Within X seconds of TTB → 90 pts
                </Text>
                <Text style={[styles.settingsBullet, { color: colors.foreground }]}>
                  <Text style={styles.bold}>80-point tier</Text>{"  "}Within Y seconds of TTB → 80 pts
                </Text>
                <Text style={[styles.settingsLine, { color: colors.mutedForeground }]}>
                  Beyond 80-point tier (but under 65-point cutoff) → 70 pts
                </Text>
              </>
            }
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />
          <SettingsBlock
            icon="🕐"
            title="Absolute Time Cutoffs"
            colors={colors}
            body={
              <>
                <Text style={[styles.settingsLine, { color: colors.mutedForeground }]}>
                  Override TTB tiers regardless of benchmark. Format: MM.SS (e.g. 12.00 = 12:00).
                </Text>
                <Text style={[styles.settingsBullet, { color: colors.foreground }]}>
                  <Text style={styles.bold}>65-point cutoff</Text>{"  "}Times ≥ this → 65 pts (default: 12:00)
                </Text>
                <Text style={[styles.settingsBullet, { color: colors.foreground }]}>
                  <Text style={styles.bold}>50-point cutoff</Text>{"  "}Times ≥ this → 50 pts (default: 16:00)
                </Text>
              </>
            }
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />
          <SettingsBlock
            icon="🏷"
            title="Special Status Code Labels"
            colors={colors}
            body={
              <>
                <Text style={[styles.settingsLine, { color: colors.mutedForeground }]}>
                  Customize the display name for each code. The codes entered in the Mile Time field (MU, MED, ABS, EXC) never change.
                </Text>
                <View style={[styles.innerTable, { borderColor: colors.border }]}>
                  <ThreeColHeader cols={["Code", "Default Label", "Your Label"]} colors={colors} />
                  <ThreeColRow cols={["MU",  "Make-Up",  "(customizable)"]} colors={colors} />
                  <ThreeColRow cols={["MED", "Medical",  "(customizable)"]} colors={colors} />
                  <ThreeColRow cols={["ABS", "Absent",   "(customizable)"]} colors={colors} />
                  <ThreeColRow cols={["EXC", "Excused",  "(customizable)"]} colors={colors} />
                </View>
              </>
            }
          />
        </View>

        {/* Import column names */}
        <SectionHeader icon="📥" title="IMPORT — ACCEPTED HEADERS" colors={colors} />
        <View style={[styles.table, { borderColor: colors.border }]}>
          <TwoColHeader col1="Field" col2="Accepted Names" colors={colors} />
          <TwoColRow col1="Student ID"   col2="studentid, id, student_id" colors={colors} />
          <TwoColRow col1="Roll Call"    col2="rollcall, roll, number, #" colors={colors} />
          <TwoColRow col1="Last Name"    col2="lastname, last, surname" colors={colors} />
          <TwoColRow col1="First Name"   col2="firstname, first, given" colors={colors} />
          <TwoColRow col1="Time to Beat" col2="timetobeat, ttb, goal" colors={colors} />
          <TwoColRow col1="Mile Time"    col2="miletime, mile, time, runtime" colors={colors} />
        </View>

        {/* Tips */}
        <SectionHeader icon="💡" title="TIPS & REMINDERS" colors={colors} />
        <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Tip text="Click any column header to sort; click again to reverse." colors={colors} />
          <Tip text="Data saves automatically — no need to click Save." colors={colors} />
          <Tip text="Export CSV regularly to back up each class period." colors={colors} />
          <Tip text="Seconds must be 00–59 (e.g. 10.60 is not valid)." colors={colors} />
          <Tip text="If CSV download fails, use Copy to Clipboard in the export modal." colors={colors} />
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Scores auto-calculate on every keystroke  ·  Click any header to sort  ·  Data auto-saves  ·  Customize thresholds & labels in ⚙ Settings
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#f1f5f9" },
  headerSub: { fontSize: 12, color: "#94a3b8" },

  scroll: { padding: 14, gap: 0 },

  callout: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  calloutTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  calloutBody: { fontSize: 14, lineHeight: 22 },
  mono: { fontFamily: "monospace", fontWeight: "600" },

  navNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 4,
  },
  navNoteText: { flex: 1, fontSize: 12, lineHeight: 18 },

  sectionHeader: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 14,
    marginBottom: 2,
  },
  sectionHeaderText: { fontSize: 13, fontWeight: "700", color: "#f1f5f9", letterSpacing: 0.3 },

  table: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  tableHead: {},
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  cell: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    lineHeight: 17,
  },
  headCell: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  centerCell: { textAlign: "center", fontWeight: "700" },
  bold: { fontWeight: "600" },

  note: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 4,
  },
  noteText: { fontSize: 12, lineHeight: 18 },

  settingsCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  settingsBlock: {
    padding: 12,
    gap: 6,
    borderTopWidth: 0,
  },
  settingsBlockTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  settingsLine: { fontSize: 12, lineHeight: 17 },
  settingsBullet: { fontSize: 12, lineHeight: 17, paddingLeft: 4 },
  settingsDivider: { height: 1 },

  innerTable: {
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 6,
  },

  tipsCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 4,
  },
  tipRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bullet: { fontSize: 16, lineHeight: 20, fontWeight: "700" },
  tipText: { flex: 1, fontSize: 13, lineHeight: 20 },

  footer: {
    marginTop: 16,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  footerText: { fontSize: 11, lineHeight: 17, textAlign: "center" },
});
