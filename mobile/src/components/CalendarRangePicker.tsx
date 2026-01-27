import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../theme/colors";
import type { Locale } from "../i18n/translations";

type Range = { start: Date | null; end: Date | null };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function clampToMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function weekdayLabels(locale: Locale) {
  if (locale === "en") return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  if (locale === "ja") return ["日", "月", "火", "水", "木", "金", "土"];
  return ["일", "월", "화", "수", "목", "금", "토"];
}

function formatMonthTitle(view: Date, locale: Locale) {
  const y = view.getFullYear();
  const m = view.getMonth() + 1;
  if (locale === "en") return `${y}-${String(m).padStart(2, "0")}`;
  if (locale === "ja") return `${y}年 ${m}月`;
  return `${y}년 ${m}월`;
}

export function CalendarRangePicker(props: {
  locale: Locale;
  value: Range;
  onChange: (next: Range) => void;
}) {
  const initial = useMemo(() => {
    return clampToMonth(props.value.end ?? props.value.start ?? new Date());
  }, []);
  const [viewMonth, setViewMonth] = useState<Date>(initial);

  const cells = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const firstWeekday = first.getDay(); // 0..6 (Sun..Sat)
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

    const out: Array<{ date: Date; inMonth: boolean }> = [];
    // leading blanks from previous month
    for (let i = 0; i < firstWeekday; i++) {
      const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1 - (firstWeekday - i));
      out.push({ date: d, inMonth: false });
    }
    // current month
    for (let day = 1; day <= daysInMonth; day++) {
      out.push({ date: new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day), inMonth: true });
    }
    // trailing to 42
    while (out.length < 42) {
      const last = out[out.length - 1]!.date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      out.push({ date: d, inMonth: false });
    }
    return out;
  }, [viewMonth]);

  const start = props.value.start ? startOfDay(props.value.start) : null;
  const end = props.value.end ? startOfDay(props.value.end) : null;

  function onPick(d: Date) {
    const picked = startOfDay(d);
    if (!start || (start && end)) {
      props.onChange({ start: picked, end: null });
      return;
    }
    // start exists, end missing
    if (picked < start) props.onChange({ start: picked, end: start });
    else props.onChange({ start, end: picked });
  }

  function inRange(d: Date) {
    if (!start) return false;
    if (!end) return isSameDay(d, start);
    return d >= start && d <= end;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const next = new Date(viewMonth);
            next.setMonth(next.getMonth() - 1);
            setViewMonth(clampToMonth(next));
          }}
          style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{formatMonthTitle(viewMonth, props.locale)}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const next = new Date(viewMonth);
            next.setMonth(next.getMonth() + 1);
            setViewMonth(clampToMonth(next));
          }}
          style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {weekdayLabels(props.locale).map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((c) => {
          const d = startOfDay(c.date);
          const selected = inRange(d);
          const isStart = start ? isSameDay(d, start) : false;
          const isEnd = end ? isSameDay(d, end) : false;
          const inThisMonth = c.inMonth;
          return (
            <Pressable
              key={`${c.date.toISOString()}`}
              accessibilityRole="button"
              onPress={() => onPick(c.date)}
              style={({ pressed }) => [
                styles.cell,
                !inThisMonth && styles.cellDim,
                selected && styles.cellSelected,
                (isStart || isEnd) && styles.cellEdge,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.cellText, !inThisMonth && styles.cellTextDim, selected && styles.cellTextSelected]}>
                {c.date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: "#FAFCFF",
    padding: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  monthTitle: { fontSize: 13, fontWeight: "900", color: Colors.text },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  navText: { fontSize: 16, fontWeight: "900", color: Colors.primary },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  weekday: { width: "14.285%", textAlign: "center", fontSize: 11, fontWeight: "800", color: Colors.mutedText },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.285%",
    // 세로 공간을 조금 덜 차지하게(가로 대비 높이 축소)
    aspectRatio: 1.25,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  cellDim: { opacity: 0.45 },
  cellSelected: { backgroundColor: "#E4F0FF" },
  cellEdge: { backgroundColor: "#2563EB" },
  cellText: { fontSize: 12, fontWeight: "800", color: Colors.text },
  cellTextDim: { color: Colors.mutedText },
  cellTextSelected: { color: "#0F172A" },
});

