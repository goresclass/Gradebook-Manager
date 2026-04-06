import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatCard } from "@/components/StatCard";
import { StudentCard } from "@/components/StudentCard";
import { useGradebook, StudentRow } from "@/context/GradebookContext";
import { useColors } from "@/hooks/useColors";
import { SCORE_CFG } from "@/utils/grading";

type SortField = "rollCall" | "lastName" | "firstName" | "score";

export default function GradebookScreen() {
  const colors = useColors() as Record<string, string>;
  const insets = useSafeAreaInsets();
  const { rows, ready, className, setClassName, addRow, deleteRow, updateRow, clearAll, importCSV, withScores, stats } = useGradebook();

  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortField>("rollCall");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [editingClass, setEditingClass] = useState(false);

  const handleSort = useCallback((col: SortField) => {
    Haptics.selectionAsync();
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
      if (sortCol === "score")   { av = a.score ?? -1; bv = b.score ?? -1; }
      return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
    });
  }, [withScores, search, sortCol, sortDir]);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const name = (asset.name || "").toLowerCase();
      if (!name.endsWith(".csv") && !name.endsWith(".txt") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
        Alert.alert("Unsupported File", "Please select a .csv or .txt file exported from a spreadsheet app.", [{ text: "OK" }]);
        return;
      }
      // Use fetch() which reliably handles all URI types (file://, content://, etc.)
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (!text || !text.trim()) {
        Alert.alert("Import Failed", "The file appears to be empty.");
        return;
      }
      const { count, error } = importCSV(text);
      if (error) {
        Alert.alert("Import Failed", error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Imported", `${count} student${count !== 1 ? "s" : ""} imported successfully.`);
      }
    } catch (e) {
      Alert.alert("Import Error", "Could not read the selected file. Make sure it is a plain .csv file (not an Excel format).");
    }
  }, [importCSV]);

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Student Data?",
      "This will delete every row and start a fresh sheet. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            clearAll();
          },
        },
      ]
    );
  };

  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 80);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading gradebook…</Text>
      </View>
    );
  }

  const SortButton = ({ col, label }: { col: SortField; label: string }) => (
    <TouchableOpacity onPress={() => handleSort(col)} style={[styles.sortBtn, sortCol === col && { backgroundColor: colors.primary }]}>
      <Text style={[styles.sortBtnText, { color: sortCol === col ? "#fff" : colors.mutedForeground }]}>
        {label} {sortCol === col ? (sortDir === 1 ? "↑" : "↓") : ""}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: topPad + 14 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}>
              <Feather name="activity" size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Mile Run</Text>
              {editingClass ? (
                <TextInput
                  autoFocus
                  value={className}
                  onChangeText={setClassName}
                  onBlur={() => setEditingClass(false)}
                  style={styles.classInput}
                  returnKeyType="done"
                  onSubmitEditing={() => setEditingClass(false)}
                />
              ) : (
                <TouchableOpacity onPress={() => setEditingClass(true)}>
                  <Text style={styles.className}>
                    {className} <Feather name="edit-2" size={11} color="#94a3b8" />
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleImport}
              style={[styles.actionBtn, { backgroundColor: "#7c3aed" }]}
            >
              <Feather name="upload" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); addRow(); }}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="user-plus" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/export")}
              style={[styles.actionBtn, { backgroundColor: "#15803d" }]}
            >
              <Feather name="download" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClearAll}
              style={[styles.actionBtn, { backgroundColor: "rgba(239,68,68,0.15)" }]}
            >
              <Feather name="trash-2" size={16} color="#f87171" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
          <Feather name="search" size={15} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students…"
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={15} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Stats row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.statsScroll, { backgroundColor: colors.secondary }]}
        contentContainerStyle={styles.statsContent}
      >
        <StatCard label="Students" value={stats.total} />
        <StatCard label="Graded" value={stats.graded} />
        {stats.special > 0 && <StatCard label="MU / Med" value={stats.special} />}
        <StatCard label="Class Avg" value={stats.avg ?? "—"} />
        {stats.dist.map(([s, cnt]) => (
          <StatCard
            key={s}
            label={`${s}s`}
            value={cnt}
            accentColor={(colors as Record<string, string>)[`score${s}bar`]}
          />
        ))}
      </ScrollView>

      {/* Sort buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.sortScroll, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        contentContainerStyle={styles.sortContent}
      >
        <SortButton col="rollCall" label="Roll #" />
        <SortButton col="lastName" label="Last Name" />
        <SortButton col="firstName" label="First Name" />
        <SortButton col="score" label="Score" />
      </ScrollView>

      {/* List */}
      <FlatList
        style={{ flex: 1 }}
        data={sorted}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 100 }]}
        renderItem={({ item, index }) => (
          <StudentCard
            row={item}
            index={index}
            onUpdate={updateRow}
            onDelete={deleteRow}
            onPress={row => router.push({ pathname: "/student/[id]", params: { id: String(row.id) } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No students yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Tap the + button above to add your first student
            </Text>
          </View>
        }
        ListFooterComponent={
          sorted.length > 0 ? (
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); addRow(); }}
              style={[styles.addRowBtn, { borderColor: colors.border }]}
            >
              <Feather name="plus" size={16} color={colors.mutedForeground} />
              <Text style={[styles.addRowText, { color: colors.mutedForeground }]}>Add student row</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 15 },

  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#f1f5f9" },
  className: { fontSize: 12, color: "#94a3b8" },
  classInput: {
    fontSize: 12,
    color: "#e2e8f0",
    borderBottomWidth: 1,
    borderBottomColor: "#3b82f6",
    paddingVertical: 1,
    minWidth: 100,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#e2e8f0" },

  statsScroll: { borderBottomWidth: 1, flexShrink: 0 },
  statsContent: { paddingHorizontal: 14, paddingVertical: 5, gap: 8, flexDirection: "row" },

  sortScroll: { borderBottomWidth: 1, flexShrink: 0 },
  sortContent: { paddingHorizontal: 14, paddingVertical: 4, gap: 6, flexDirection: "row" },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  sortBtnText: { fontSize: 12, fontWeight: "600" },

  listContent: { padding: 14 },

  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },

  addRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 4,
  },
  addRowText: { fontSize: 14, fontWeight: "500" },
});
