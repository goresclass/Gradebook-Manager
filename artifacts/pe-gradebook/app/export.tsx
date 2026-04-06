import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useMemo } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as XLSX from "xlsx";

import { useGradebook } from "@/context/GradebookContext";
import { useColors } from "@/hooks/useColors";
import { SCORE_CFG, calcScore, getSpecial } from "@/utils/grading";

export default function ExportScreen() {
  const colors = useColors() as Record<string, string>;
  const insets = useSafeAreaInsets();
  const { rows, className, stats } = useGradebook();

  // ── CSV ─────────────────────────────────────────────────────────────────
  const csv = useMemo(() => {
    const headers = ["Student ID", "Roll Call", "Last Name", "First Name", "Time to Beat", "Mile Time", "Score"];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const dataRows = rows.map(r => {
      const score = calcScore(r.mileTime, r.ttb);
      const sp = getSpecial(r.mileTime);
      const sv = sp ? sp.label : (score !== null ? score : "");
      return [r.studentId, r.rollCall, r.lastName, r.firstName, r.ttb, r.mileTime, sv].map(escape).join(",");
    });
    return [headers.map(escape).join(","), ...dataRows].join("\n");
  }, [rows]);

  const safeName = (className || "gradebook").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const csvFileName = `${safeName}_grades.csv`;
  const xlsxFileName = `${safeName}_grades.xlsx`;

  // ── Excel export ─────────────────────────────────────────────────────────
  const handleExcelExport = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Build worksheet data
      const headerRow = ["Student ID", "Roll Call", "Last Name", "First Name", "Time to Beat", "Mile Time", "Score"];
      const dataRows = rows.map(r => {
        const score = calcScore(r.mileTime, r.ttb);
        const sp = getSpecial(r.mileTime);
        const sv = sp ? sp.label : (score !== null ? score : "");
        return [r.studentId, r.rollCall, r.lastName, r.firstName, r.ttb, r.mileTime, sv];
      });

      const wsData = [headerRow, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Column widths
      ws["!cols"] = [
        { wch: 14 }, // Student ID
        { wch: 8 },  // Roll Call
        { wch: 16 }, // Last Name
        { wch: 14 }, // First Name
        { wch: 14 }, // TTB
        { wch: 12 }, // Mile Time
        { wch: 8 },  // Score
      ];

      // Style header row bold
      const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[cellAddr]) {
          ws[cellAddr].s = { font: { bold: true }, fill: { fgColor: { rgb: "1E3A5F" } }, fontColor: { rgb: "FFFFFF" } };
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, className || "Grades");

      // Write as base64
      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      if (Platform.OS === "web") {
        // Web: trigger download
        const blob = new Blob(
          [Uint8Array.from(atob(base64), c => c.charCodeAt(0))],
          { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = xlsxFileName;
        a.click();
        URL.revokeObjectURL(url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Native: save to cache then share
        const uri = (FileSystem.cacheDirectory ?? "") + xlsxFileName;
        await FileSystem.writeAsStringAsync(uri, base64, {
          encoding: "base64" as any,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "Save or share your gradebook",
            UTI: "com.microsoft.excel.xlsx",
          });
        } else {
          Alert.alert("Sharing not available", "Your device does not support file sharing.");
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Export Failed", "Could not generate the Excel file. Please try the CSV option instead.");
    }
  };

  // ── CSV handlers ─────────────────────────────────────────────────────────
  const handleCopy = async () => {
    await Clipboard.setStringAsync(csv);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", "CSV data copied to clipboard. Paste into a spreadsheet app to open.");
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: csv, title: csvFileName });
    } catch {
      Alert.alert("Share failed", "Could not share the file.");
    }
  };

  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 80);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: topPad + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export Grades</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 40 }]}>
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>{className}</Text>
          <Text style={[styles.summarySubtitle, { color: colors.mutedForeground }]}>
            {stats.total} students · {stats.graded} graded · Class avg: {stats.avg ?? "—"}
          </Text>
          <View style={styles.distRow}>
            {stats.dist.map(([s, cnt]) =>
              cnt > 0 ? (
                <View key={s} style={[styles.distChip, { backgroundColor: colors[`score${s}bg`] }]}>
                  <Text style={[styles.distChipScore, { color: colors[`score${s}fg`] }]}>{s}</Text>
                  <Text style={[styles.distChipCount, { color: colors[`score${s}fg`] }]}>×{cnt}</Text>
                </View>
              ) : null
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.actionsTitle, { color: colors.mutedForeground }]}>Export Options</Text>

          {/* Excel — primary */}
          <TouchableOpacity
            onPress={handleExcelExport}
            style={[styles.actionRow, { borderColor: colors.border }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#d1fae5" }]}>
              <Feather name="file-text" size={18} color="#047857" />
            </View>
            <View style={styles.actionText}>
              <View style={styles.actionLabelRow}>
                <Text style={[styles.actionLabel, { color: colors.foreground }]}>Export as Excel (.xlsx)</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Aeries</Text>
                </View>
              </View>
              <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
                Real Excel file — upload directly to Aeries gradebook
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Copy CSV */}
          <TouchableOpacity
            onPress={handleCopy}
            style={[styles.actionRow, { borderColor: colors.border }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#dbeafe" }]}>
              <Feather name="copy" size={18} color="#1d4ed8" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>Copy CSV to Clipboard</Text>
              <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
                Paste into Google Sheets or Numbers
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Share CSV */}
          <TouchableOpacity
            onPress={handleShare}
            style={[styles.actionRow, styles.lastActionRow]}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#fef9c3" }]}>
              <Feather name="share-2" size={18} color="#a16207" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>Share CSV File</Text>
              <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
                Send via AirDrop, email, or other apps
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.previewTitle, { color: colors.mutedForeground }]}>CSV Preview</Text>
          <Text style={[styles.previewText, { color: colors.foreground }]} numberOfLines={20}>
            {csv}
          </Text>
        </View>

        {/* Score legend */}
        <View style={[styles.legendCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.legendTitle, { color: colors.mutedForeground }]}>Score Reference</Text>
          {Object.entries(SCORE_CFG).map(([s, cfg]) => (
            <View key={s} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors[cfg.barKey] }]} />
              <Text style={[styles.legendScore, { color: colors.foreground }]}>{s}</Text>
              <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>{cfg.label}</Text>
            </View>
          ))}
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
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600", color: "#f1f5f9", textAlign: "center", marginRight: -28 },

  scroll: { padding: 16, gap: 12 },

  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    marginBottom: 4,
  },
  summaryTitle: { fontSize: 17, fontWeight: "700" },
  summarySubtitle: { fontSize: 13 },
  distRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 },
  distChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  distChipScore: { fontSize: 14, fontWeight: "700" },
  distChipCount: { fontSize: 12 },

  actionsCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  actionsTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  lastActionRow: { borderBottomWidth: 0 },
  actionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionText: { flex: 1 },
  actionLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionLabel: { fontSize: 15, fontWeight: "600" },
  actionDesc: { fontSize: 12, marginTop: 1 },
  badge: { backgroundColor: "#059669", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },

  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
  },
  previewTitle: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  previewText: { fontSize: 11, fontFamily: "monospace", lineHeight: 18 },

  legendCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  legendTitle: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendScore: { fontSize: 13, fontWeight: "700", width: 32 },
  legendLabel: { fontSize: 13, flex: 1 },
});
