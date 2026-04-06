import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
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

import { ScoreBadge } from "@/components/ScoreBadge";
import { useGradebook, StudentRow } from "@/context/GradebookContext";
import { useSettings } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { SCORE_CFG, buildSpecial, calcScore, formatMMSS, getSpecial, parseMMSS } from "@/utils/grading";

// Field must be a top-level component (not defined inside the screen)
// so React preserves its identity across re-renders and the keyboard stays open.
type FieldProps = {
  label: string;
  field: keyof StudentRow;
  placeholder?: string;
  mono?: boolean;
  hint?: string;
  value: string;
  onChangeText: (field: keyof StudentRow, val: string) => void;
  borderColor: string;
  labelColor: string;
  inputColor: string;
  hintColor: string;
};

function Field({
  label,
  field,
  placeholder,
  mono,
  hint,
  value,
  onChangeText,
  borderColor,
  labelColor,
  inputColor,
  hintColor,
}: FieldProps) {
  return (
    <View style={[styles.fieldGroup, { borderColor }]}>
      <Text style={[styles.fieldLabel, { color: labelColor }]}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          { color: inputColor, fontFamily: mono ? "monospace" : undefined },
        ]}
        value={value}
        onChangeText={val => onChangeText(field, val)}
        placeholder={placeholder}
        placeholderTextColor={hintColor}
        autoCapitalize={mono ? "none" : "words"}
        autoCorrect={false}
        spellCheck={false}
      />
      {hint ? <Text style={[styles.fieldHint, { color: hintColor }]}>{hint}</Text> : null}
    </View>
  );
}

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors() as Record<string, string>;
  const insets = useSafeAreaInsets();
  const { rows, updateRow, deleteRow } = useGradebook();
  const { gradingConfig } = useSettings();
  const SPECIAL = buildSpecial(gradingConfig);
  const numId = parseInt(id, 10);
  const row = rows.find(r => r.id === numId);

  const handleChange = React.useCallback(
    (field: keyof StudentRow, val: string) => updateRow(numId, field, val),
    [numId, updateRow]
  );

  if (!row) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Student not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const score = calcScore(row.mileTime, row.ttb, gradingConfig);
  const sp = getSpecial(row.mileTime, gradingConfig);
  const mileSeconds = parseMMSS(row.mileTime);
  const ttbSeconds = parseMMSS(row.ttb);
  const cfg = score !== null ? SCORE_CFG[score] : null;

  const handleDelete = () => {
    Alert.alert("Remove Student", `Remove ${row.firstName || row.lastName || "this student"}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteRow(row.id);
          router.back();
        },
      },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 80);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const fieldProps = {
    onChangeText: handleChange,
    borderColor: colors.border,
    labelColor: colors.mutedForeground,
    inputColor: colors.foreground,
    hintColor: colors.mutedForeground,
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: topPad + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {[row.firstName, row.lastName].filter(Boolean).join(" ") || "Edit Student"}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={18} color="#f87171" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Score summary card */}
        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.scoreCardLeft}>
            <Text style={[styles.scoreCardTitle, { color: colors.foreground }]}>Current Score</Text>
            {cfg ? (
              <Text style={[styles.scoreLabel, { color: colors[cfg.barKey] }]}>{cfg.label}</Text>
            ) : sp ? (
              <Text style={[styles.scoreLabel, { color: colors[sp.fgKey] }]}>{sp.title}</Text>
            ) : (
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>No time entered</Text>
            )}
            {mileSeconds !== null && ttbSeconds !== null && score !== null ? (
              <Text style={[styles.diff, { color: colors.mutedForeground }]}>
                Mile: {formatMMSS(mileSeconds)} · TTB: {formatMMSS(ttbSeconds)}
              </Text>
            ) : null}
          </View>
          <ScoreBadge mileTime={row.mileTime} score={score} size="lg" />
        </View>

        {/* Special codes helper */}
        <View style={[styles.helperCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.helperTitle, { color: colors.mutedForeground }]}>Mile Time Codes</Text>
          <View style={styles.helperRow}>
            {Object.entries(SPECIAL).map(([key, val]) => (
              <View key={key} style={[styles.helperChip, { backgroundColor: colors[val.bgKey] }]}>
                <Text style={[styles.helperChipText, { color: colors[val.fgKey] }]}>{val.label}</Text>
                <Text style={[styles.helperChipLabel, { color: colors[val.fgKey] }]}>{val.title}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.helperHint, { color: colors.mutedForeground }]}>
            Times: MM.SS format (e.g. 8.07 = 8:07 · 10.59 = 10:59)
          </Text>
        </View>

        {/* Student info fields */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Student Info</Text>
          <Field {...fieldProps} label="First Name" field="firstName" placeholder="First name" value={row.firstName} />
          <Field {...fieldProps} label="Last Name" field="lastName" placeholder="Last name" value={row.lastName} />
          <Field {...fieldProps} label="Student ID" field="studentId" placeholder="Student ID" mono value={row.studentId} />
          <Field {...fieldProps} label="Roll Call #" field="rollCall" placeholder="#" mono value={row.rollCall} />
        </View>

        {/* Time fields */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Times</Text>
          <Field
            {...fieldProps}
            label="Time to Beat (TTB)"
            field="ttb"
            placeholder="MM.SS (e.g. 9.30)"
            mono
            hint="Personal goal time for this student"
            value={row.ttb}
          />
          <Field
            {...fieldProps}
            label="Mile Time"
            field="mileTime"
            placeholder="MM.SS or MU / MED / ABS / EXC"
            mono
            hint="Enter MU (make-up), MED (medical), ABS (absent), or EXC (excused)"
            value={row.mileTime}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 16 },
  backLink: { fontSize: 15, fontWeight: "600", marginTop: 4 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600", color: "#f1f5f9" },
  deleteBtn: { padding: 4 },

  scroll: { padding: 16, gap: 12 },

  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  scoreCardLeft: { flex: 1, gap: 4 },
  scoreCardTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  scoreLabel: { fontSize: 16, fontWeight: "700" },
  diff: { fontSize: 12, fontVariant: ["tabular-nums"] },

  helperCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    marginBottom: 4,
  },
  helperTitle: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  helperRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  helperChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  helperChipText: { fontSize: 12, fontWeight: "700" },
  helperChipLabel: { fontSize: 11 },
  helperHint: { fontSize: 11 },

  section: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  fieldGroup: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  fieldInput: { fontSize: 15, paddingVertical: 2 },
  fieldHint: { fontSize: 11, marginTop: 4 },
});
