import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const C = Colors.light;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + webTopInset,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
    >
      <View style={styles.nav}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/")} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </Pressable>
        <Text style={styles.navTitle}>設定</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>通知スケジュール</Text>
        <View style={styles.scheduleCard}>
          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={20} color={C.slate} />
            <Text style={styles.scheduleText}>月・水・金</Text>
          </View>
          <View style={styles.scheduleDivider} />
          <View style={styles.scheduleRow}>
            <Ionicons name="time-outline" size={20} color={C.slate} />
            <Text style={styles.scheduleText}>9:00</Text>
          </View>
        </View>
        <Text style={styles.scheduleNote}>
          このスケジュールで配信が届く想定です。プロトタイプでは「配信シミュレート」ボタンで手動配信できます。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>配信ルール</Text>
        <View style={styles.ruleCard}>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark-circle" size={16} color={C.success} />
            <Text style={styles.ruleText}>YESが多いほど優先的に配信</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="remove-circle" size={16} color={C.skip} />
            <Text style={styles.ruleText}>SKIPすると優先順位が少し下がる</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="close-circle" size={16} color={C.danger} />
            <Text style={styles.ruleText}>NOするとクールダウン期間が発生</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="help-circle" size={16} color={C.slate} />
            <Text style={styles.ruleText}>3回に1回「役に立った？」を聞きます</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NOクールダウン</Text>
        <View style={styles.ruleCard}>
          <Text style={styles.cooldownLine}>NO 1回 → 5日間</Text>
          <Text style={styles.cooldownLine}>NO 2回 → 7日間</Text>
          <Text style={styles.cooldownLine}>NO 3回 → 9日間</Text>
          <Text style={styles.cooldownLine}>NO 4回以上 → 11日間</Text>
          <Text style={[styles.cooldownLine, { color: C.danger }]}>
            NO 5回 → 削除確認
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>Life Hack Reminder v1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navTitle: {
    fontSize: 17,
    fontFamily: "NotoSansJP_700Bold",
    color: C.ink,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "NotoSansJP_500Medium",
    color: C.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  scheduleCard: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scheduleText: {
    fontSize: 20,
    fontFamily: "NotoSansJP_700Bold",
    color: C.ink,
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: C.borderLight,
    marginVertical: 14,
  },
  scheduleNote: {
    fontSize: 12,
    fontFamily: "NotoSansJP_400Regular",
    color: C.textMuted,
    marginTop: 10,
    lineHeight: 18,
  },
  ruleCard: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.borderLight,
    gap: 12,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ruleText: {
    fontSize: 14,
    fontFamily: "NotoSansJP_400Regular",
    color: C.textPrimary,
    flex: 1,
  },
  cooldownLine: {
    fontSize: 14,
    fontFamily: "NotoSansJP_500Medium",
    color: C.textPrimary,
  },
  footer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 20,
  },
  version: {
    fontSize: 12,
    fontFamily: "NotoSansJP_400Regular",
    color: C.textMuted,
  },
});
