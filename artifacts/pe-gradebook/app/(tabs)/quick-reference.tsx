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

function TableHeader({ cols, colors }: { cols: string[]; colors: Colors }) {
  return (
    <View style={[styles.row, styles.tableHead, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      {cols.map((c, i) => (
        <Text key={i} style={[styles.cell, styles.headCell, { color: colors.mutedForeground, flex: FLEX[i] ?? 1 }]}>{c}</Text>
      ))}
    </View>
  );
}

const FLEX = [0.6, 1, 1.4];

function TableRow({ cols, colors, accent }: { cols: string[]; colors: Colors; accent?: string }) {
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      {cols.map((c, i) => (
        <Text key={i} style={[
          styles.cell,
          { color: accent && i === 0 ? accent : colors.foreground, flex: FLEX[i] ?? 1 },
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

function Tip({ text, colors }: { text: string; colors: Colors }) {
  return (
    <View style={styles.tipRow}>
      <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
      <Text style={[styles.tipText, { color: colors.foreground }]}>{text}</Text>
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
          <Text style={[styles.calloutTitle, { color: colors.primary }]}>Time Format</Text>
          <Text style={[styles.calloutBody, { color: colors.foreground }]}>
            Enter times as <Text style={styles.mono}>MM.SS</Text> (minutes.seconds){"\n"}
            <Text style={styles.mono}>10.59</Text> = 10:59  ·  <Text style={styles.mono}>8.07</Text> = 8:07
          </Text>
        </View>

        {/* Grading Parameters */}
        <SectionHeader icon="📊" title="GRADING PARAMETERS" colors={colors} />
        <View style={[styles.table, { borderColor: colors.border }]}>
          <TableHeader cols={["Score", "Condition", "What It Means"]} colors={colors} />
          <TableRow cols={["100", "Mile ≤ TTB", "Beat their benchmark"]} colors={colors} accent={scoreBadgeColors["100"]} />
          <TableRow cols={["90",  "1–10 sec over TTB", "Very close to benchmark"]} colors={colors} accent={scoreBadgeColors["90"]} />
          <TableRow cols={["80",  "11–29 sec over TTB", "Close to benchmark"]} colors={colors} accent={scoreBadgeColors["80"]} />
          <TableRow cols={["70",  "30+ sec over TTB (under 12:00)", "Over benchmark, still sub-12"]} colors={colors} accent={scoreBadgeColors["70"]} />
          <TableRow cols={["65",  "12:00–15:59 (TTB ignored)", "Time overrides all TTB tiers"]} colors={colors} accent={scoreBadgeColors["65"]} />
          <TableRow cols={["50",  "≥ 16:00 (TTB ignored)", "Slowest tier — no TTB calc"]} colors={colors} accent={scoreBadgeColors["50"]} />
        </View>
        <View style={[styles.note, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            12:00 and 16:00 thresholds always override TTB comparisons. If no TTB is set, students can only score 50, 65, or 70 based on absolute time.
          </Text>
        </View>

        {/* Special Status Codes */}
        <SectionHeader icon="🏷" title="SPECIAL STATUS CODES" colors={colors} />
        <View style={[styles.table, { borderColor: colors.border }]}>
          <TwoColHeader col1="Code" col2="Meaning / When to Use" colors={colors} />
          <TwoColRow col1="MU  —  Make-Up"  col2="Student needs a make-up run" colors={colors} />
          <TwoColRow col1="MED  —  Medical" col2="Medical excuse on file" colors={colors} />
          <TwoColRow col1="ABS  —  Absent"  col2="Student was absent" colors={colors} />
          <TwoColRow col1="EXC  —  Excused" col2="General excused exemption" colors={colors} />
        </View>
        <View style={[styles.note, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            Enter codes in the Mile Time column. Students with special codes are not counted in the class average.
          </Text>
        </View>

        {/* Toolbar Buttons */}
        <SectionHeader icon="🖱" title="TOOLBAR BUTTONS" colors={colors} />
        <View style={[styles.table, { borderColor: colors.border }]}>
          <TwoColHeader col1="Button" col2="What It Does" colors={colors} />
          <TwoColRow col1="↑ Import CSV"    col2="Load a roster or data file" colors={colors} />
          <TwoColRow col1="↓ Export CSV"    col2="Download grades as a spreadsheet" colors={colors} />
          <TwoColRow col1="+ Add Student"   col2="Add a blank row to the list" colors={colors} />
          <TwoColRow col1="Clear All"       col2="Wipe sheet and start fresh (confirms first)" colors={colors} />
          <TwoColRow col1="Class / Period"  col2="Edit the class name used in export filenames" colors={colors} />
        </View>

        {/* Column Guide */}
        <SectionHeader icon="📋" title="COLUMN GUIDE" colors={colors} />
        <View style={[styles.table, { borderColor: colors.border }]}>
          <TwoColHeader col1="Column" col2="Notes" colors={colors} />
          <TwoColRow col1="Roll #"       col2="Roll call number — sorts numerically" colors={colors} />
          <TwoColRow col1="Student ID"   col2="School ID — included in CSV export" colors={colors} />
          <TwoColRow col1="Last / First Name" col2="Student name fields" colors={colors} />
          <TwoColRow col1="Time to Beat" col2="Personal benchmark in MM.SS (e.g. best prior time + 0:30)" colors={colors} />
          <TwoColRow col1="Mile Time"    col2="Actual run time in MM.SS, or a special code (MU / MED / ABS / EXC)" colors={colors} />
          <TwoColRow col1="Score"        col2="Auto-calculated — cannot be edited manually" colors={colors} />
        </View>

        {/* Import column names */}
        <SectionHeader icon="📥" title="IMPORT — ACCEPTED COLUMN NAMES" colors={colors} />
        <View style={[styles.table, { borderColor: colors.border }]}>
          <TwoColHeader col1="Field" col2="Accepted Header Names" colors={colors} />
          <TwoColRow col1="Student ID"   col2="studentid, student id, id, student_id" colors={colors} />
          <TwoColRow col1="Roll Call"    col2="rollcall, roll call, roll, number, #" colors={colors} />
          <TwoColRow col1="Last Name"    col2="lastname, last name, last, surname" colors={colors} />
          <TwoColRow col1="First Name"   col2="firstname, first name, first, given" colors={colors} />
          <TwoColRow col1="Time to Beat" col2="timetobeat, ttb, goal, goaltime" colors={colors} />
          <TwoColRow col1="Mile Time"    col2="miletime, mile time, mile, time, runtime" colors={colors} />
        </View>

        {/* Tips */}
        <SectionHeader icon="💡" title="TIPS & REMINDERS" colors={colors} />
        <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Tip text="Tap any column header to sort; tap again to reverse." colors={colors} />
          <Tip text="Data saves automatically — no need to tap Save." colors={colors} />
          <Tip text="Export CSV regularly to back up each class period." colors={colors} />
          <Tip text="Seconds must be 00–59 (e.g. 10.60 is not valid)." colors={colors} />
          <Tip text="Import appends to existing data — duplicates are not auto-removed." colors={colors} />
          <Tip text="If export doesn't start, use Copy to Clipboard on the export screen." colors={colors} />
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
    marginBottom: 16,
  },
  calloutTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  calloutBody: { fontSize: 14, lineHeight: 22 },
  mono: { fontFamily: "monospace", fontWeight: "600" },

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
});
