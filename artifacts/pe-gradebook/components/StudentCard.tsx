import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { StudentRow } from "@/context/GradebookContext";
import { useSettings } from "@/context/SettingsContext";
import { ScoreBadge } from "@/components/ScoreBadge";
import { calcScore, getSpecial } from "@/utils/grading";

type Props = {
  row: StudentRow;
  index: number;
  onUpdate: (id: number, field: keyof StudentRow, val: string) => void;
  onDelete: (id: number) => void;
  onPress: (row: StudentRow) => void;
};

export function StudentCard({ row, index, onUpdate, onDelete, onPress }: Props) {
  const colors = useColors() as Record<string, string>;
  const { gradingConfig } = useSettings();
  const score = calcScore(row.mileTime, row.ttb, gradingConfig);
  const sp = getSpecial(row.mileTime, gradingConfig);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove Student", `Remove ${row.firstName || row.lastName || "this student"}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => onDelete(row.id) },
    ]);
  };

  const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unnamed Student";

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(row)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.left}>
          <View style={[styles.rollBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.rollText, { color: colors.mutedForeground }]}>
              {row.rollCall || String(index + 1)}
            </Text>
          </View>
        </View>

        <View style={styles.middle}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {fullName}
          </Text>
          <View style={styles.timeRow}>
            {row.ttb ? (
              <View style={styles.timePill}>
                <Feather name="target" size={11} color={colors.mutedForeground} />
                <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                  TTB: {row.ttb}
                </Text>
              </View>
            ) : null}
            {row.mileTime ? (
              <View style={styles.timePill}>
                <Feather name="activity" size={11} color={colors.accent} />
                <Text style={[styles.timeText, { color: colors.accent }]}>
                  {row.mileTime}
                </Text>
              </View>
            ) : (
              <Text style={[styles.noTime, { color: colors.mutedForeground }]}>No time entered</Text>
            )}
          </View>
        </View>

        <View style={styles.right}>
          <ScoreBadge mileTime={row.mileTime} score={score} />
        </View>

        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="trash-2" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 8,
  },
  left: {
    alignItems: "center",
  },
  rollBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rollText: {
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  middle: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
  },
  timeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  noTime: {
    fontSize: 12,
  },
  right: {
    alignItems: "center",
    minWidth: 50,
  },
  deleteBtn: {
    padding: 4,
  },
});
