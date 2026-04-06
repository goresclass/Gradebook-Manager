import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { SCORE_CFG, getSpecial } from "@/utils/grading";

type Props = {
  mileTime: string;
  score: number | null;
  size?: "sm" | "md" | "lg";
};

export function ScoreBadge({ mileTime, score, size = "md" }: Props) {
  const colors = useColors() as Record<string, string>;
  const sp = getSpecial(mileTime);

  if (sp) {
    return (
      <View style={[styles.badge, styles.special, { backgroundColor: colors[sp.bgKey] }]}>
        <Text style={[styles.specialText, { color: colors[sp.fgKey] }]}>{sp.label}</Text>
      </View>
    );
  }

  if (score === null) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>—</Text>
      </View>
    );
  }

  const cfg = SCORE_CFG[score];
  if (!cfg) return null;

  const barWidth = `${score}%` as const;

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: colors[cfg.bgKey] }]}>
        <Text style={[styles.scoreText, { color: colors[cfg.fgKey] }]}>{score}</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.barFill,
            { width: barWidth, backgroundColor: colors[cfg.barKey] },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 2,
  },
  badge: {
    minWidth: 44,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  special: {
    minWidth: 40,
    height: 24,
    borderRadius: 5,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  specialText: {
    fontSize: 11,
    fontWeight: "600",
  },
  barTrack: {
    width: 44,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  empty: {
    width: 44,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
});
