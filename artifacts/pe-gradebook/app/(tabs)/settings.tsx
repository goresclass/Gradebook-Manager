import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGradebook } from "@/context/GradebookContext";
import { useSettings, ThemePreference, SwipeOrder } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { DEFAULT_GRADING_CONFIG, formatMMSS } from "@/utils/grading";

// ── Helper: seconds ↔ MM.SS display ────────────────────────────────────────
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

// ── Sub-components ─────────────────────────────────────────────────────────

type Colors = Record<string, string>;

function SectionHeader({ icon, title, colors }: { icon: string; title: string; colors: Colors }) {
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.header }]}>
      <Text style={styles.sectionHeaderText}>{icon}  {title}</Text>
    </View>
  );
}

function FieldRow({
  label,
  hint,
  value,
  onChangeText,
  onBlur,
  keyboardType = "default",
  colors,
  borderColor,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  colors: Colors;
  borderColor: string;
}) {
  return (
    <View style={[styles.fieldRow, { borderColor }]}>
      <View style={styles.fieldLeft}>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
        {hint ? <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>{hint}</Text> : null}
      </View>
      <TextInput
        style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        selectTextOnFocus
      />
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useColors() as Colors;
  const insets = useSafeAreaInsets();
  const { gradingConfig, updateGradingConfig, updateSpecialLabel, resetToDefaults, themePreference, setThemePreference, swipeOrder, setSwipeOrder } = useSettings();
  const { classes, activeClassId, restoreBackup } = useGradebook();
  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 80);
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── Cloud sync state ─────────────────────────────────────────────────────
  const [syncCode, setSyncCode] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("pe_gb_sync_code_v1").then((v) => { if (v) setSyncCode(v); });
    AsyncStorage.getItem("pe_gb_last_synced_v1").then((v) => { if (v) setLastSynced(v); });
  }, []);

  const saveSyncCode = (code: string) => {
    setSyncCode(code);
    AsyncStorage.setItem("pe_gb_sync_code_v1", code);
  };

  const getApiBase = () => {
    if (typeof process !== "undefined" && process.env.EXPO_PUBLIC_DOMAIN) {
      return `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
    }
    return "http://localhost:8080/api";
  };

  const handleCloudPush = async () => {
    const code = syncCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      Alert.alert("Enter Sync Code", "Set a sync code (4–12 letters or numbers) before pushing.");
      return;
    }
    setSyncBusy(true);
    try {
      const payload = {
        app: "mile-run-grader",
        appVersion: 2,
        exportDate: new Date().toISOString(),
        gradebook: { classes, activeClassId },
        settings: { gradingConfig },
      };
      const res = await fetch(`${getApiBase()}/sync/${code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const now = new Date().toLocaleString();
      setLastSynced(now);
      AsyncStorage.setItem("pe_gb_last_synced_v1", now);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Synced!", `Your data is now saved in the cloud under code ${code}.`);
    } catch (e) {
      Alert.alert("Sync Failed", `Could not push to cloud: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setSyncBusy(false);
    }
  };

  const handleCloudPull = async () => {
    const code = syncCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      Alert.alert("Enter Sync Code", "Enter the sync code used when you last pushed data.");
      return;
    }
    setSyncBusy(true);
    try {
      const res = await fetch(`${getApiBase()}/sync/${code}`);
      if (res.status === 404) {
        Alert.alert("Not Found", `No backup found for code ${code}. Double-check the code and try again.`);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data: Record<string, unknown>; updatedAt: string };
      const parsed = json.data as {
        app?: string;
        gradebook?: { classes: unknown[]; activeClassId: string };
        settings?: { gradingConfig: unknown };
      };
      if (parsed.app !== "mile-run-grader" || !parsed.gradebook?.classes) {
        Alert.alert("Invalid Data", "The cloud backup looks corrupted or incompatible.");
        return;
      }
      const { classes: newClasses, activeClassId: newActiveId } = parsed.gradebook;
      const totalStudents = (newClasses as { rows: unknown[] }[]).reduce((s, c) => s + c.rows.length, 0);
      const savedAt = new Date(json.updatedAt).toLocaleString();
      Alert.alert(
        "Restore from Cloud?",
        `Found ${newClasses.length} class${newClasses.length !== 1 ? "es" : ""}, ${totalStudents} student${totalStudents !== 1 ? "s" : ""} (saved ${savedAt}).\n\nThis will replace all current data.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "destructive",
            onPress: () => {
              restoreBackup(newClasses as Parameters<typeof restoreBackup>[0], newActiveId);
              if (parsed.settings?.gradingConfig) updateGradingConfig(parsed.settings.gradingConfig as Parameters<typeof updateGradingConfig>[0]);
              const now = new Date().toLocaleString();
              setLastSynced(now);
              AsyncStorage.setItem("pe_gb_last_synced_v1", now);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Restored", "Your gradebook has been restored from the cloud.");
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert("Pull Failed", `Could not fetch from cloud: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setSyncBusy(false);
    }
  };

  // ── Backup handlers ───────────────────────────────────────────────────────

  const handleExportBackup = async () => {
    try {
      const totalStudents = classes.reduce((sum, c) => sum + c.rows.length, 0);
      const payload = {
        app: "mile-run-grader",
        appVersion: 2,
        exportDate: new Date().toISOString(),
        gradebook: { classes, activeClassId },
        settings: { gradingConfig },
      };
      const json = JSON.stringify(payload, null, 2);
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `mile_run_backup_${dateStr}.json`;

      if (Platform.OS === "web") {
        // Web: trigger browser download
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert("Backup Downloaded", `${classes.length} class${classes.length !== 1 ? "es" : ""}, ${totalStudents} students saved.`);
      } else {
        const path = (FileSystem.cacheDirectory ?? "") + fileName;
        await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, { mimeType: "application/json", dialogTitle: "Save Backup" });
      }
    } catch (e) {
      Alert.alert("Export Failed", "Could not create backup file.");
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error("fetch failed");
      const text = await response.text();
      const parsed = JSON.parse(text);
      if (parsed.app !== "mile-run-grader" || !parsed.gradebook?.classes) {
        Alert.alert("Invalid File", "This file does not appear to be a Mile Run Grader backup.");
        return;
      }
      const { classes: newClasses, activeClassId: newActiveId } = parsed.gradebook;
      const totalStudents = newClasses.reduce((s: number, c: { rows: unknown[] }) => s + c.rows.length, 0);
      Alert.alert(
        "Restore Backup?",
        `This backup contains ${newClasses.length} class${newClasses.length !== 1 ? "es" : ""} and ${totalStudents} student${totalStudents !== 1 ? "s" : ""}.\n\nRestoring will replace all current gradebook data. This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "destructive",
            onPress: () => {
              restoreBackup(newClasses, newActiveId);
              if (parsed.settings?.gradingConfig) {
                updateGradingConfig(parsed.settings.gradingConfig);
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Restored", "Gradebook data has been restored from the backup.");
            },
          },
        ]
      );
    } catch {
      Alert.alert("Import Failed", "Could not read the file. Make sure it is a valid .json backup.");
    }
  };

  // Local editable state for time threshold inputs
  const [tier90, setTier90] = useState(String(gradingConfig.tier90MaxSecs));
  const [tier80, setTier80] = useState(String(gradingConfig.tier80MaxSecs));
  const [thresh65, setThresh65] = useState(secsToDisplay(gradingConfig.threshold65Secs));
  const [thresh50, setThresh50] = useState(secsToDisplay(gradingConfig.threshold50Secs));

  const [muLabel,  setMuLabel]  = useState(gradingConfig.specialLabels.mu);
  const [medLabel, setMedLabel] = useState(gradingConfig.specialLabels.med);
  const [absLabel, setAbsLabel] = useState(gradingConfig.specialLabels.abs);
  const [excLabel, setExcLabel] = useState(gradingConfig.specialLabels.exc);

  // Commit numeric tier on blur
  const commitTier90 = () => {
    const v = parseInt(tier90, 10);
    if (!isNaN(v) && v >= 1 && v < gradingConfig.tier80MaxSecs) {
      updateGradingConfig({ tier90MaxSecs: v });
    } else {
      setTier90(String(gradingConfig.tier90MaxSecs));
    }
  };

  const commitTier80 = () => {
    const v = parseInt(tier80, 10);
    if (!isNaN(v) && v > gradingConfig.tier90MaxSecs) {
      updateGradingConfig({ tier80MaxSecs: v });
    } else {
      setTier80(String(gradingConfig.tier80MaxSecs));
    }
  };

  const commitThresh65 = () => {
    const secs = displayToSecs(thresh65);
    if (secs !== null && secs > 0 && secs < gradingConfig.threshold50Secs) {
      updateGradingConfig({ threshold65Secs: secs });
      setThresh65(secsToDisplay(secs));
    } else {
      setThresh65(secsToDisplay(gradingConfig.threshold65Secs));
    }
  };

  const commitThresh50 = () => {
    const secs = displayToSecs(thresh50);
    if (secs !== null && secs > gradingConfig.threshold65Secs) {
      updateGradingConfig({ threshold50Secs: secs });
      setThresh50(secsToDisplay(secs));
    } else {
      setThresh50(secsToDisplay(gradingConfig.threshold50Secs));
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Reset to Defaults",
      "This will restore all grading parameters and status code labels to their original values.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
          },
        },
      ]
    );
  };

  const borderColor = colors.border;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: topPad + 14 }]}>
        <View style={[styles.headerLogo, { backgroundColor: colors.primary }]}>
          <Feather name="settings" size={18} color="#fff" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSub}>Grading parameters &amp; status codes</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Appearance ── */}
        <SectionHeader icon="🎨" title="APPEARANCE" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor }]}>
          <Text style={[styles.fieldLabel, { color: colors.foreground, marginBottom: 10 }]}>Theme</Text>
          <View style={styles.themeRow}>
            {(["system", "light", "dark"] as ThemePreference[]).map((opt) => {
              const active = themePreference === opt;
              const icon = opt === "system" ? "smartphone" : opt === "light" ? "sun" : "moon";
              const label = opt === "system" ? "System" : opt === "light" ? "Light" : "Dark";
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setThemePreference(opt);
                  }}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: active ? colors.primary : colors.input,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather name={icon as any} size={16} color={active ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.themeLabel, { color: active ? "#fff" : colors.mutedForeground }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.cardNote, { color: colors.mutedForeground, marginTop: 8 }]}>
            "System" follows your device's appearance setting automatically.
          </Text>
        </View>

        {/* ── Swipe Order ── */}
        <SectionHeader icon="👆" title="SWIPE ORDER" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor }]}>
          <Text style={[styles.fieldLabel, { color: colors.foreground, marginBottom: 10 }]}>Navigate students by</Text>
          <View style={styles.themeRow}>
            {([
              { key: "roll",      label: "Roll #",     icon: "hash" },
              { key: "firstName", label: "First Name",  icon: "user" },
              { key: "lastName",  label: "Last Name",   icon: "users" },
            ] as { key: SwipeOrder; label: string; icon: string }[]).map(({ key, label, icon }) => {
              const active = swipeOrder === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSwipeOrder(key);
                  }}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: active ? colors.primary : colors.input,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather name={icon as any} size={16} color={active ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.themeLabel, { color: active ? "#fff" : colors.mutedForeground }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.cardNote, { color: colors.mutedForeground, marginTop: 8 }]}>
            Sets the order used when swiping or tapping the arrows on a student's detail screen.
          </Text>
        </View>

        {/* ── TTB-based tiers ── */}
        <SectionHeader icon="🎯" title="TTB-BASED SCORING" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor }]}>
          <Text style={[styles.cardNote, { color: colors.mutedForeground }]}>
            These tiers apply when a student has a Time to Beat (TTB) entered and their absolute time is under the 65-point cutoff.
          </Text>
          <FieldRow
            label="90-point tier"
            hint={`Within X seconds of TTB → 90 pts  (currently: ≤ ${gradingConfig.tier90MaxSecs}s)`}
            value={tier90}
            onChangeText={setTier90}
            onBlur={commitTier90}
            keyboardType="numeric"
            colors={colors}
            borderColor={borderColor}
          />
          <FieldRow
            label="80-point tier"
            hint={`Within Y seconds of TTB → 80 pts  (currently: ≤ ${gradingConfig.tier80MaxSecs}s)`}
            value={tier80}
            onChangeText={setTier80}
            onBlur={commitTier80}
            keyboardType="numeric"
            colors={colors}
            borderColor={borderColor}
          />
          <View style={[styles.infoRow, { borderColor }]}>
            <Feather name="info" size={13} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Anything beyond the 80-point tier (but under the 65-point cutoff) scores 70 points.
              100 points requires beating or tying the TTB.
            </Text>
          </View>
        </View>

        {/* ── Absolute time cutoffs ── */}
        <SectionHeader icon="⏱" title="ABSOLUTE TIME CUTOFFS" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor }]}>
          <Text style={[styles.cardNote, { color: colors.mutedForeground }]}>
            These cutoffs override TTB tiers regardless of the student's benchmark.
            Format: MM.SS (e.g. 12.00 = 12:00).
          </Text>
          <FieldRow
            label="65-point cutoff"
            hint={`Times ≥ this → 65 pts  (currently: ${formatMMSS(gradingConfig.threshold65Secs)})`}
            value={thresh65}
            onChangeText={setThresh65}
            onBlur={commitThresh65}
            keyboardType="decimal-pad"
            colors={colors}
            borderColor={borderColor}
          />
          <FieldRow
            label="50-point cutoff"
            hint={`Times ≥ this → 50 pts  (currently: ${formatMMSS(gradingConfig.threshold50Secs)})`}
            value={thresh50}
            onChangeText={setThresh50}
            onBlur={commitThresh50}
            keyboardType="decimal-pad"
            colors={colors}
            borderColor={borderColor}
          />
        </View>

        {/* ── Special status labels ── */}
        <SectionHeader icon="🏷" title="SPECIAL STATUS CODE LABELS" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor }]}>
          <Text style={[styles.cardNote, { color: colors.mutedForeground }]}>
            Customize the display name for each status code. The codes themselves (MU, MED, ABS, EXC)
            entered in the Mile Time field remain unchanged.
          </Text>
          {(
            [
              { code: "MU",  key: "mu"  as const, value: muLabel,  set: setMuLabel  },
              { code: "MED", key: "med" as const, value: medLabel, set: setMedLabel },
              { code: "ABS", key: "abs" as const, value: absLabel, set: setAbsLabel },
              { code: "EXC", key: "exc" as const, value: excLabel, set: setExcLabel },
            ]
          ).map(({ code, key, value, set }) => (
            <FieldRow
              key={code}
              label={code}
              value={value}
              onChangeText={set}
              onBlur={() => updateSpecialLabel(key, value.trim() || DEFAULT_GRADING_CONFIG.specialLabels[key])}
              colors={colors}
              borderColor={borderColor}
            />
          ))}
        </View>

        {/* ── Cloud Sync ── */}
        <SectionHeader icon="🔄" title="CLOUD SYNC" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor }]}>
          <Text style={[styles.cardNote, { color: colors.mutedForeground }]}>
            Push your data to the cloud and pull it back on any device. Pick a memorable code — anyone with the same code can overwrite it, so keep it private.
          </Text>

          {/* Sync code input */}
          <View style={[styles.syncCodeRow, { borderBottomColor: borderColor, borderBottomWidth: 1 }]}>
            <Feather name="key" size={15} color={colors.mutedForeground} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.syncCodeInput, { color: colors.foreground }]}
              placeholder="Your sync code (e.g. SMITH5A)"
              placeholderTextColor={colors.mutedForeground}
              value={syncCode}
              onChangeText={(t) => saveSyncCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              autoCapitalize="characters"
              maxLength={12}
              editable={!syncBusy}
            />
            {syncCode.length > 0 && (
              <TouchableOpacity onPress={() => saveSyncCode("")}>
                <Feather name="x" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {lastSynced && (
            <View style={[styles.syncLastRow, { borderBottomColor: borderColor, borderBottomWidth: 1 }]}>
              <Feather name="check-circle" size={13} color="#22c55e" />
              <Text style={[styles.syncLastText, { color: colors.mutedForeground }]}>Last synced {lastSynced}</Text>
            </View>
          )}

          {/* Push / Pull */}
          <View style={styles.syncButtonRow}>
            <TouchableOpacity
              onPress={handleCloudPush}
              disabled={syncBusy}
              style={[styles.syncBtn, styles.syncBtnPush, syncBusy && { opacity: 0.5 }]}
            >
              <Feather name="upload-cloud" size={16} color="#fff" />
              <Text style={styles.syncBtnLabel}>Push to Cloud</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCloudPull}
              disabled={syncBusy}
              style={[styles.syncBtn, styles.syncBtnPull, syncBusy && { opacity: 0.5 }]}
            >
              <Feather name="download-cloud" size={16} color="#fff" />
              <Text style={styles.syncBtnLabel}>Pull from Cloud</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Cloud Backup ── */}
        <SectionHeader icon="☁️" title="LOCAL BACKUP (FILE)" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor }]}>
          <Text style={[styles.cardNote, { color: colors.mutedForeground }]}>
            Export your entire gradebook (all periods, all run history) as a JSON file you can save to
            iCloud, Google Drive, or any cloud storage. Restore it on any device running this app.
          </Text>

          {/* Export */}
          <TouchableOpacity
            onPress={handleExportBackup}
            style={[styles.backupBtn, { borderColor, backgroundColor: colors.secondary }]}
          >
            <View style={[styles.backupBtnIcon, { backgroundColor: "#0e7490" }]}>
              <Feather name="upload-cloud" size={16} color="#fff" />
            </View>
            <View style={styles.backupBtnText}>
              <Text style={[styles.backupBtnTitle, { color: colors.foreground }]}>Export Backup</Text>
              <Text style={[styles.backupBtnHint, { color: colors.mutedForeground }]}>
                {classes.length} class{classes.length !== 1 ? "es" : ""} · {classes.reduce((s, c) => s + c.rows.length, 0)} students · includes run history
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Import / Restore */}
          <TouchableOpacity
            onPress={handleImportBackup}
            style={[styles.backupBtn, { borderColor, borderTopWidth: 1, backgroundColor: colors.secondary }]}
          >
            <View style={[styles.backupBtnIcon, { backgroundColor: "#7c3aed" }]}>
              <Feather name="download-cloud" size={16} color="#fff" />
            </View>
            <View style={styles.backupBtnText}>
              <Text style={[styles.backupBtnTitle, { color: colors.foreground }]}>Restore from Backup</Text>
              <Text style={[styles.backupBtnHint, { color: colors.mutedForeground }]}>
                Pick a .json backup file to replace all current data
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* ── Reset ── */}
        <TouchableOpacity
          onPress={handleReset}
          style={[styles.resetBtn, { borderColor: colors.border }]}
        >
          <Feather name="rotate-ccw" size={15} color="#f87171" />
          <Text style={styles.resetText}>Reset All to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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

  sectionHeader: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 14,
    marginBottom: 2,
  },
  sectionHeaderText: { fontSize: 13, fontWeight: "700", color: "#f1f5f9", letterSpacing: 0.3 },

  card: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  cardNote: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  fieldLeft: { flex: 1, gap: 2 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
  fieldHint: { fontSize: 11, lineHeight: 16 },
  fieldInput: {
    width: 80,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },

  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  resetText: { color: "#f87171", fontSize: 14, fontWeight: "600" },

  syncCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  syncCodeInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 1,
  },
  syncLastRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  syncLastText: { fontSize: 11 },
  syncButtonRow: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  syncBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 10,
  },
  syncBtnPush: { backgroundColor: "#0e7490" },
  syncBtnPull: { backgroundColor: "#7c3aed" },
  syncBtnLabel: { color: "#fff", fontSize: 13, fontWeight: "700" },

  backupBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  backupBtnIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  backupBtnText: { flex: 1, gap: 2 },
  backupBtnTitle: { fontSize: 14, fontWeight: "600" },
  backupBtnHint: { fontSize: 11, lineHeight: 16 },

  themeRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
