import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useApp } from "@/lib/AppContext";
import { getItemMainText, getTypeLabel } from "@/lib/types";
import { getCooldownInfo } from "@/lib/delivery";
import type { ActiveItem } from "@/lib/types";
import Colors from "@/constants/colors";

const C = Colors.light;

function ItemCard({ item, onPress }: { item: ActiveItem; onPress: () => void }) {
  const cooldown = getCooldownInfo(item);
  const typeColors: Record<string, string> = {
    lifeCard: C.accent,
    nudge: C.slate,
    playbook: C.deepNavy,
  };
  const tagColor = typeColors[item.type] || C.accent;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: tagColor }]}>
          <Text style={styles.typeBadgeText}>{getTypeLabel(item.type)}</Text>
        </View>
        {cooldown.isCoolingDown && (
          <View style={styles.cooldownBadge}>
            <Ionicons name="time-outline" size={12} color={C.warning} />
            <Text style={styles.cooldownText}>
              {cooldown.remainingDays}日
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.cardMainText} numberOfLines={2}>
        {getItemMainText(item)}
      </Text>
      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle" size={14} color={C.success} />
          <Text style={styles.statText}>{item.stats.yesCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="close-circle" size={14} color={C.danger} />
          <Text style={styles.statText}>{item.stats.noCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="remove-circle" size={14} color={C.skip} />
          <Text style={styles.statText}>{item.stats.skipCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { activeItems, isLoading, simulateDelivery, getLastDelivery } =
    useApp();

  const handleSimulate = async () => {
    const { item, delivery } = await simulateDelivery();
    if (item && delivery) {
      router.push({
        pathname: "/doom",
        params: { deliveryId: delivery.id },
      });
    }
  };

  const handleOpenLast = () => {
    const { item, delivery } = getLastDelivery();
    if (item && delivery) {
      router.push({
        pathname: "/doom",
        params: { deliveryId: delivery.id },
      });
    }
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  const lastDelivery = getLastDelivery();
  const hasLastDelivery = !!lastDelivery.item && !!lastDelivery.delivery;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + webTopInset,
          paddingBottom: insets.bottom + webBottomInset,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Life Hack Reminder</Text>
        <Text style={styles.counter}>
          10個中 <Text style={styles.counterBold}>{activeItems.length}個</Text>
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={handleSimulate}
          disabled={activeItems.length === 0}
        >
          <Ionicons name="flash" size={18} color="#fff" />
          <Text style={styles.actionBtnTextPrimary}>配信シミュレート</Text>
        </Pressable>
        {hasLastDelivery && (
          <Pressable
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={handleOpenLast}
          >
            <Ionicons name="eye" size={18} color={C.accent} />
            <Text style={styles.actionBtnTextSecondary}>最新の配信</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={activeItems}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() =>
              router.push({ pathname: "/edit", params: { id: item.id } })
            }
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={48} color={C.textMuted} />
            <Text style={styles.emptyText}>
              まだアイテムがありません
            </Text>
            <Text style={styles.emptySubText}>
              下の「追加」ボタンから始めましょう
            </Text>
          </View>
        }
      />

      <View style={styles.bottomBar}>
        <Pressable
          style={styles.bottomBtn}
          onPress={() => router.push("/delete-box")}
          testID="delete-box-btn"
        >
          <Ionicons name="trash-outline" size={22} color={C.textSecondary} />
          <Text style={styles.bottomBtnText}>削除BOX</Text>
        </Pressable>
        <View style={styles.addButtonWrap}>
          <Pressable
            style={styles.addButton}
            onPress={() => {
              if (activeItems.length >= 10) {
                router.push({
                  pathname: "/replace-select",
                  params: { mode: "addNew" },
                });
              } else {
                router.push("/add");
              }
            }}
            testID="add-btn"
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </View>
        <Pressable
          style={styles.bottomBtn}
          onPress={() => router.push("/settings")}
          testID="settings-btn"
        >
          <Ionicons name="settings-outline" size={22} color={C.textSecondary} />
          <Text style={styles.bottomBtnText}>設定</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: "NotoSansJP_700Bold",
    color: C.ink,
    letterSpacing: -0.5,
  },
  counter: {
    fontSize: 14,
    fontFamily: "NotoSansJP_400Regular",
    color: C.textSecondary,
    marginTop: 4,
  },
  counterBold: {
    fontFamily: "NotoSansJP_700Bold",
    color: C.accent,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  actionBtnPrimary: {
    backgroundColor: C.accent,
  },
  actionBtnSecondary: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionBtnTextPrimary: {
    fontSize: 13,
    fontFamily: "NotoSansJP_500Medium",
    color: "#fff",
  },
  actionBtnTextSecondary: {
    fontSize: 13,
    fontFamily: "NotoSansJP_500Medium",
    color: C.accent,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: "NotoSansJP_500Medium",
    color: "#fff",
  },
  cooldownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cooldownText: {
    fontSize: 11,
    fontFamily: "NotoSansJP_500Medium",
    color: "#92400E",
  },
  cardMainText: {
    fontSize: 15,
    fontFamily: "NotoSansJP_500Medium",
    color: C.textPrimary,
    lineHeight: 22,
    marginBottom: 10,
  },
  cardStats: {
    flexDirection: "row",
    gap: 14,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: "NotoSansJP_400Regular",
    color: C.textSecondary,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "NotoSansJP_500Medium",
    color: C.textSecondary,
  },
  emptySubText: {
    fontSize: 13,
    fontFamily: "NotoSansJP_400Regular",
    color: C.textMuted,
  },
  bottomBar: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: Platform.OS === "web" ? 34 : 20,
    backgroundColor: C.cardBg,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  bottomBtn: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 16,
  },
  bottomBtnText: {
    fontSize: 10,
    fontFamily: "NotoSansJP_400Regular",
    color: C.textSecondary,
  },
  addButtonWrap: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
