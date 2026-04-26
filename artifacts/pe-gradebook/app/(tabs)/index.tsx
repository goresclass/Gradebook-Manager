import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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

// ── Period Switcher ──────────────────────────────────────────────────────────

type PeriodSwitcherProps = {
  colors: Record<string, string>;
};

function PeriodSwitcher({ colors }: PeriodSwitcherProps) {
  const { classes, activeClassId, setActiveClass, addClass, deleteClass, setClassName, className } = useGradebook();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const handleChipPress = (id: string) => {
    if (id === activeClassId) {
      // Start editing the active class name
      setEditValue(className);
      setEditingId(id);
    } else {
      Haptics.selectionAsync();
      setActiveClass(id);
    }
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      setClassName(editValue.trim());
    }
    setEditingId(null);
  };

  const handleAddClass = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextNum = classes.length + 1;
    const defaultName = `Period ${nextNum}`;
    const newId = addClass(defaultName);
    // Start editing the new period name immediately after render
    setTimeout(() => {
      setEditValue(defaultName);
      setEditingId(newId);
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  const handleDeletePress = (id: string) => {
    if (classes.length <= 1) {
      Alert.alert("Cannot Delete", "You need at least one class period.");
      return;
    }
    const cls = classes.find(c => c.id === id);
    const studentCount = cls?.rows.filter(r => r.rollCall || r.lastName || r.firstName || r.mileTime).length ?? 0;
    const detail = studentCount > 0
      ? `This will remove all ${studentCount} student${studentCount !== 1 ? "s" : ""} in this period. This cannot be undone.`
      : "This cannot be undone.";
    Alert.alert(`Delete "${cls?.name ?? "this period"}"?`, detail, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteClass(id);
        },
      },
    ]);
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.periodRow}
    >
      {classes.map(cls => {
        const isActive = cls.id === activeClassId;
        const isEditing = editingId === cls.id;
        return (
          <View key={cls.id} style={[
            styles.periodChip,
            isActive ? { backgroundColor: colors.primary } : { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 },
          ]}>
            {isEditing ? (
              <TextInput
                autoFocus
                value={editValue}
                onChangeText={setEditValue}
                onBlur={commitEdit}
                onSubmitEditing={commitEdit}
                returnKeyType="done"
                style={[styles.periodChipInput, { color: "#fff" }]}
                selectTextOnFocus
              />
            ) : (
              <TouchableOpacity
                onPress={() => handleChipPress(cls.id)}
                onLongPress={() => handleDeletePress(cls.id)}
                delayLongPress={400}
                style={styles.periodChipInner}
              >
                <Text style={[
                  styles.periodChipText,
                  { color: isActive ? "#fff" : colors.mutedForeground },
                  isActive && styles.periodChipTextActive,
                ]}>
                  {cls.name}
                </Text>
                {isActive && (
                  <Feather name="edit-2" size={10} color="rgba(255,255,255,0.6)" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Add period button */}
      <TouchableOpacity
        onPress={handleAddClass}
        style={[styles.periodAddBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
      >
        <Feather name="plus" size={14} color={colors.mutedForeground} />
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function GradebookScreen() {
  const colors = useColors() as Record<string, string>;
  const insets = useSafeAreaInsets();
  const { rows, ready, addRow, deleteRow, updateRow, clearAll, importCSV, importMileTimes, withScores, stats, className, archiveRuns, renameRunLabel, classes, setActiveClass } = useGradebook();
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [search, setSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState(false);
  const [sortCol, setSortCol] = useState<SortField>("rollCall");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

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

  // Cross-class search: flat list of all students across all periods
  type GlobalRow = typeof rows[number] & { classId: string; classLabel: string };
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

  const pickAndReadFile = useCallback(async (): Promise<string | null> => {
    if (Platform.OS === "web") {
      return new Promise<string | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv,.txt,text/csv,text/plain";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) { resolve(null); return; }
          const reader = new FileReader();
          reader.onload = (ev) => {
            const text = ev.target?.result as string;
            if (!text?.trim()) {
              Alert.alert("Import Failed", "The file appears to be empty.");
              resolve(null);
            } else {
              resolve(text);
            }
          };
          reader.onerror = () => { Alert.alert("Import Error", "Could not read the file."); resolve(null); };
          reader.readAsText(file);
        };
        input.addEventListener("cancel", () => resolve(null));
        document.body.appendChild(input);
        input.click();
        setTimeout(() => { if (document.body.contains(input)) document.body.removeChild(input); }, 0);
      });
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];
    const name = (asset.name || "").toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".txt")) {
      Alert.alert("Unsupported File", "Please select a .csv file.", [{ text: "OK" }]);
      return null;
    }
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (!text?.trim()) {
      Alert.alert("Import Failed", "The file appears to be empty.");
      return null;
    }
    return text;
  }, []);

  const doImportRoster = useCallback(async () => {
    setShowImportModal(false);
    try {
      const text = await pickAndReadFile();
      if (!text) return;
      const { count, error } = importCSV(text);
      if (error) {
        Alert.alert("Import Failed", error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Imported", `${count} student${count !== 1 ? "s" : ""} added to the roster.`);
      }
    } catch {
      Alert.alert("Import Error", "Could not read the selected file.");
    }
  }, [importCSV, pickAndReadFile]);

  const doImportTimes = useCallback(async () => {
    setShowImportModal(false);
    try {
      const text = await pickAndReadFile();
      if (!text) return;
      const { updated, notFound, error } = importMileTimes(text);
      if (error) {
        Alert.alert("Import Failed", error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const msg = notFound > 0
          ? `${updated} student${updated !== 1 ? "s" : ""} updated.\n${notFound} row${notFound !== 1 ? "s" : ""} didn't match any student.`
          : `${updated} student${updated !== 1 ? "s" : ""} updated.`;
        Alert.alert("Mile Times Imported", msg);
      }
    } catch {
      Alert.alert("Import Error", "Could not read the selected file.");
    }
  }, [importMileTimes, pickAndReadFile]);

  const handleImport = useCallback(() => {
    if (Platform.OS === "web") {
      setShowImportModal(true);
      return;
    }
    Alert.alert(
      "Import CSV",
      "What would you like to import?",
      [
        {
          text: "Full Roster",
          onPress: async () => {
            try {
              const text = await pickAndReadFile();
              if (!text) return;
              const { count, error } = importCSV(text);
              if (error) {
                Alert.alert("Import Failed", error);
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("Imported", `${count} student${count !== 1 ? "s" : ""} added to the roster.`);
              }
            } catch {
              Alert.alert("Import Error", "Could not read the selected file.");
            }
          },
        },
        {
          text: "Mile Times Only",
          onPress: async () => {
            try {
              const text = await pickAndReadFile();
              if (!text) return;
              const { updated, notFound, error } = importMileTimes(text);
              if (error) {
                Alert.alert("Import Failed", error);
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                const msg = notFound > 0
                  ? `${updated} student${updated !== 1 ? "s" : ""} updated.\n${notFound} row${notFound !== 1 ? "s" : ""} in the file didn't match any student.`
                  : `${updated} student${updated !== 1 ? "s" : ""} updated.`;
                Alert.alert("Mile Times Imported", msg);
              }
            } catch {
              Alert.alert("Import Error", "Could not read the selected file.");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }, [importCSV, importMileTimes, pickAndReadFile]);

  const hasArchivedRuns = rows.some(r => r.runs.length > 0);

  const handleArchiveRuns = () => {
    const withTime = rows.filter(r => r.mileTime.trim()).length;

    if (hasArchivedRuns) {
      const archiveOption = withTime > 0
        ? [{
            text: "Archive Current Run",
            onPress: () => {
              Alert.alert(
                "Archive Run Scores",
                `Save mile times for ${withTime} student${withTime !== 1 ? "s" : ""} in "${className}"?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Archive",
                    onPress: () => {
                      const count = archiveRuns();
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      Alert.alert("Archived", `${count} run${count !== 1 ? "s" : ""} saved.`);
                    },
                  },
                ]
              );
            },
          }]
        : [];

      Alert.alert(
        "Archive",
        withTime > 0 ? "Archive now or edit past run dates?" : "No times to archive — edit past dates?",
        [
          ...archiveOption,
          { text: "Edit Archive Dates", onPress: () => setShowDatesModal(true) },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    if (withTime === 0) {
      Alert.alert("Nothing to Archive", "No students in this period have a mile time entered yet.");
      return;
    }
    Alert.alert(
      "Archive Run Scores",
      `Save the current mile times for all ${withTime} student${withTime !== 1 ? "s" : ""} in "${className}" as a dated history entry?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: () => {
            const count = archiveRuns();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Archived", `${count} run${count !== 1 ? "s" : ""} saved to student history.`);
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Student Data?",
      `This will delete every row in "${className}" and start a fresh sheet. This cannot be undone.`,
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

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 20) : Math.max(insets.top, 80);
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
        {/* Top row: logo + title + actions */}
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}>
              <Feather name="activity" size={18} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Mile Run Grader</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleImport}
              style={[styles.actionBtn, { backgroundColor: "#7c3aed" }]}
            >
              <Feather name="upload" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleArchiveRuns}
              style={[styles.actionBtn, { backgroundColor: "#0e7490" }]}
            >
              <Feather name="archive" size={16} color="#fff" />
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

        {/* Period switcher */}
        <PeriodSwitcher colors={colors} />

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.08)", flex: 1 }]}>
            <Feather name="search" size={15} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search students…"
              placeholderTextColor="#64748b"
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => { setSearch(""); setGlobalSearch(false); }}>
                <Feather name="x" size={15} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setGlobalSearch(g => !g); }}
            style={[
              styles.globeBtn,
              globalSearch
                ? { backgroundColor: colors.primary }
                : { backgroundColor: "rgba(255,255,255,0.08)" },
            ]}
          >
            <Feather name="globe" size={15} color={globalSearch ? "#fff" : "#94a3b8"} />
          </TouchableOpacity>
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

      {/* Sort buttons — hidden during global search */}
      {!(globalSearch && search.trim()) && (
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
      )}

      {/* Global search info bar */}
      {globalSearch && search.trim() ? (
        <View style={[styles.globalBar, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
          <Feather name="globe" size={12} color={colors.primary} />
          <Text style={[styles.globalBarText, { color: colors.mutedForeground }]}>
            Searching all {classes.length} period{classes.length !== 1 ? "s" : ""} · {globalSorted.length} result{globalSorted.length !== 1 ? "s" : ""}
          </Text>
        </View>
      ) : null}

      {/* List */}
      <FlatList
        style={{ flex: 1 }}
        data={globalSearch && search.trim() ? globalSorted : sorted}
        keyExtractor={item =>
          globalSearch && search.trim()
            ? `${(item as typeof globalSorted[number]).classId}-${item.id}`
            : String(item.id)
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 100 }]}
        renderItem={({ item, index }) => {
          const isGlobal = !!(globalSearch && search.trim());
          const gItem = item as typeof globalSorted[number];
          return (
            <View>
              {isGlobal && (
                <View style={[styles.periodBadgeRow, { backgroundColor: colors.background }]}>
                  <View style={[styles.periodBadge, { backgroundColor: colors.primary + "22" }]}>
                    <Text style={[styles.periodBadgeText, { color: colors.primary }]}>{gItem.classLabel}</Text>
                  </View>
                </View>
              )}
              <StudentCard
                row={item}
                index={index}
                onUpdate={isGlobal ? () => {} : updateRow}
                onDelete={isGlobal ? () => {} : deleteRow}
                onPress={row => {
                  if (isGlobal) {
                    setActiveClass(gItem.classId);
                    setTimeout(() => router.push({ pathname: "/student/[id]", params: { id: String(row.id) } }), 50);
                  } else {
                    router.push({ pathname: "/student/[id]", params: { id: String(row.id) } });
                  }
                }}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            {globalSearch && search.trim() ? (
              <>
                <Feather name="search" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No students found</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No matches across any period for "{search}"
                </Text>
              </>
            ) : (
              <>
                <Feather name="users" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No students yet</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Tap the + button above to add your first student
                </Text>
              </>
            )}
          </View>
        }
        ListFooterComponent={
          sorted.length > 0 && !(globalSearch && search.trim()) ? (
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

      {/* ── Archive Dates Modal ── */}
      <ArchiveDatesModal
        visible={showDatesModal}
        rows={rows}
        colors={colors}
        onRename={renameRunLabel}
        onClose={() => setShowDatesModal(false)}
      />

      {/* ── Web Import Type Modal ── */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 24, width: 300, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 16 }}>
            <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "700", marginBottom: 6 }}>Import CSV</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, marginBottom: 20 }}>What would you like to import?</Text>
            <TouchableOpacity onPress={doImportRoster} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, marginBottom: 10 }}>
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600", fontSize: 15 }}>Full Roster</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={doImportTimes} style={{ backgroundColor: "#7c3aed", borderRadius: 10, paddingVertical: 13, marginBottom: 10 }}>
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600", fontSize: 15 }}>Mile Times Only</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowImportModal(false)} style={{ paddingVertical: 10 }}>
              <Text style={{ color: colors.mutedForeground, textAlign: "center", fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Archive Dates Modal ───────────────────────────────────────────────────────

type ArchiveDatesModalProps = {
  visible: boolean;
  rows: import("@/context/GradebookContext").StudentRow[];
  colors: Record<string, string>;
  onRename: (oldLabel: string, newLabel: string) => void;
  onClose: () => void;
};

function ArchiveDatesModal({ visible, rows, colors, onRename, onClose }: ArchiveDatesModalProps) {
  // Collect unique labels ordered by most-recent first
  const uniqueLabels = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of rows) {
      for (const run of r.runs) {
        if (!seen.has(run.label)) { seen.add(run.label); out.push(run.label); }
      }
    }
    return out;
  }, [rows]);

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Keep drafts in sync when labels change
  React.useEffect(() => {
    if (visible) {
      const initial: Record<string, string> = {};
      uniqueLabels.forEach(l => { initial[l] = l; });
      setDrafts(initial);
    }
  }, [visible, uniqueLabels]);

  const countFor = (label: string) =>
    rows.reduce((n, r) => n + r.runs.filter(rec => rec.label === label).length, 0);

  const commitRename = (oldLabel: string) => {
    const newLabel = drafts[oldLabel]?.trim();
    if (newLabel && newLabel !== oldLabel) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onRename(oldLabel, newLabel);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={dmStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={dmStyles.overlayTap} onTouchEnd={onClose} />
        <View style={[dmStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[dmStyles.sheetHeader, { borderColor: colors.border }]}>
            <View style={[dmStyles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[dmStyles.sheetTitle, { color: colors.foreground }]}>Edit Archive Dates</Text>
            <Text style={[dmStyles.sheetSub, { color: colors.mutedForeground }]}>
              Changes apply to every student in this period
            </Text>
          </View>

          {uniqueLabels.length === 0 ? (
            <View style={dmStyles.empty}>
              <Feather name="clock" size={28} color={colors.mutedForeground} />
              <Text style={[dmStyles.emptyText, { color: colors.mutedForeground }]}>
                No archived runs yet
              </Text>
            </View>
          ) : (
            <ScrollView style={dmStyles.list} keyboardShouldPersistTaps="handled">
              {uniqueLabels.map((label, idx) => (
                <View
                  key={label}
                  style={[
                    dmStyles.dateRow,
                    { borderColor: colors.border },
                    idx === 0 && { borderTopWidth: 0 },
                  ]}
                >
                  <View style={dmStyles.dateLeft}>
                    <View style={[dmStyles.dateIcon, { backgroundColor: colors.secondary }]}>
                      <Feather name="calendar" size={14} color={colors.primary} />
                    </View>
                    <View style={dmStyles.dateFields}>
                      <TextInput
                        style={[dmStyles.dateInput, { color: colors.foreground, borderColor: colors.border }]}
                        value={drafts[label] ?? label}
                        onChangeText={val => setDrafts(prev => ({ ...prev, [label]: val }))}
                        onBlur={() => commitRename(label)}
                        onSubmitEditing={() => commitRename(label)}
                        returnKeyType="done"
                        autoCorrect={false}
                        selectTextOnFocus
                      />
                      <Text style={[dmStyles.dateCount, { color: colors.mutedForeground }]}>
                        {countFor(label)} student{countFor(label) !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                  {drafts[label]?.trim() !== label && drafts[label]?.trim() ? (
                    <TouchableOpacity
                      onPress={() => commitRename(label)}
                      style={[dmStyles.savePill, { backgroundColor: colors.primary }]}
                    >
                      <Text style={dmStyles.savePillText}>Save</Text>
                    </TouchableOpacity>
                  ) : (
                    <Feather name="edit-2" size={14} color={colors.mutedForeground} />
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            onPress={onClose}
            style={[dmStyles.doneBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={dmStyles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const dmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  overlayTap: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: "75%",
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 2,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  sheetSub: { fontSize: 12, textAlign: "center" },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 40,
  },
  emptyText: { fontSize: 14 },
  list: { flexGrow: 0 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  dateLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  dateIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dateFields: { flex: 1, gap: 2 },
  dateInput: {
    fontSize: 15,
    fontWeight: "600",
    borderBottomWidth: 1,
    paddingVertical: 2,
  },
  dateCount: { fontSize: 11 },
  savePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  savePillText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  doneBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  doneBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 15 },

  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#f1f5f9" },
  headerActions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  // Period switcher
  periodRow: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 10,
    alignItems: "center",
  },
  periodChip: {
    borderRadius: 22,
    paddingVertical: 9,
    paddingHorizontal: 18,
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
  },
  periodChipInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  periodChipText: {
    fontSize: 15,
    fontWeight: "500",
  },
  periodChipTextActive: {
    fontWeight: "700",
  },
  periodChipInput: {
    fontSize: 15,
    fontWeight: "700",
    minWidth: 90,
    paddingVertical: 0,
  },
  periodAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  globeBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  globalBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  globalBarText: { fontSize: 12 },
  periodBadgeRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
  },
  periodBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  periodBadgeText: { fontSize: 11, fontWeight: "700" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#e2e8f0" },

  statsScroll: { borderBottomWidth: 1, flexShrink: 0, flexGrow: 0, height: 50 },
  statsContent: { paddingHorizontal: 12, paddingVertical: 4, gap: 6, flexDirection: "row", alignItems: "center" },

  sortScroll: { borderBottomWidth: 1, flexShrink: 0, flexGrow: 0, height: 34 },
  sortContent: { paddingHorizontal: 12, paddingVertical: 0, gap: 5, flexDirection: "row", alignItems: "center" },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
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
