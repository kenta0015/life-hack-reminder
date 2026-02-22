import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Notifications from "expo-notifications";
import { useApp } from "@/lib/AppContext";
import { getItemMainText, getTypeLabel, getItemTags, getItemImageUrl } from "@/lib/types";
import { getCooldownInfo } from "@/lib/delivery";
import type { ActiveItem } from "@/lib/types";
import Colors from "@/constants/colors";

// フォアグラウンドでも通知を表示する（実機テスト用）
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const C = Colors.light;

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  lifeCard: "heart",
  nudge: "chatbubble-ellipses",
  playbook: "list",
};

function ItemCard({ item, onPress }: { item: ActiveItem; onPress: () => void }) {
  const cooldown = getCooldownInfo(item);
  const imageUrl = getItemImageUrl(item);
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
      <View style={styles.cardRow}>
        <View style={[styles.thumbWrap, { backgroundColor: tagColor + "20" }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.cardThumb}
              contentFit="cover"
            />
          ) : (
            <Ionicons
              name={TYPE_ICONS[item.type] ?? "document"}
              size={28}
              color={tagColor}
            />
          )}
        </View>
        <View style={styles.cardBody}>
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
          {getItemTags(item).length > 0 && (
            <View style={styles.cardTags}>
              {getItemTags(item).map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
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
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { activeItems, isLoading, simulateDelivery, getLastDelivery } =
    useApp();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [testNotifScheduling, setTestNotifScheduling] = useState(false);

  const allTags = useMemo(
    () => [...new Set(activeItems.flatMap((i) => getItemTags(i)))].sort(),
    [activeItems]
  );
  const filteredItems =
    selectedTag === null
      ? activeItems
      : activeItems.filter((i) => getItemTags(i).includes(selectedTag));

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

  const handleTestNotification = async () => {
    if (Platform.OS === "web") return;
    setTestNotifScheduling(true);
    try {
      const targetItem = activeItems[0];
      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (existing !== "granted") {
        const { status: requested } = await Notifications.requestPermissionsAsync();
        status = requested;
      }
      if (status !== "granted") {
        Alert.alert(
          "通知が許可されていません",
          "設定アプリから「Life Hack Reminder」の通知をオンにしてください。"
        );
        setTestNotifScheduling(false);
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Life Hack Reminder",
          body: "テスト通知です。実機で届いていればOKです。",
          data: targetItem ? { itemId: targetItem.id } : {},
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 10,
        },
      });
      Alert.alert(
        "テスト通知を予約しました",
        "10秒後に通知が届きます。アプリを閉じたりバックグラウンドにしても届きます。"
      );
    } catch (e) {
      Alert.alert("エラー", e instanceof Error ? e.message : "通知の予約に失敗しました。");
    } finally {
      setTestNotifScheduling(false);
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
      {Platform.OS !== "web" && (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={handleTestNotification}
            disabled={testNotifScheduling}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={C.accent}
            />
            <Text style={styles.actionBtnTextSecondary}>
              {testNotifScheduling ? "予約中…" : "テスト通知（10秒後）"}
            </Text>
          </Pressable>
        </View>
      )}

      {allTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          <Pressable
            style={[
              styles.filterChip,
              selectedTag === null && styles.filterChipActive,
            ]}
            onPress={() => setSelectedTag(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedTag === null && styles.filterChipTextActive,
              ]}
            >
              すべて
            </Text>
          </Pressable>
          {allTags.map((tag) => (
            <Pressable
              key={tag}
              style={[
                styles.filterChip,
                selectedTag === tag && styles.filterChipActive,
              ]}
              onPress={() => setSelectedTag(tag)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedTag === tag && styles.filterChipTextActive,
                ]}
              >
                {tag}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={filteredItems}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() =>
              router.push({ pathname: "/view", params: { id: item.id } })
            }
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={48} color={C.textMuted} />
            <Text style={styles.emptyText}>
              {selectedTag === null
                ? "まだアイテムがありません"
                : `「${selectedTag}」のアイテムはありません`}
            </Text>
            <Text style={styles.emptySubText}>
              {selectedTag === null
                ? "下の「追加」ボタンから始めましょう"
                : "タグを変えるか、アイテムにタグを付けましょう"}
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
  filterScroll: {
    maxHeight: 44,
    marginBottom: 8,
  },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 40,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "NotoSansJP_500Medium",
    color: C.textSecondary,
  },
  filterChipTextActive: {
    color: "#fff",
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
  cardRow: {
    flexDirection: "row",
    gap: 12,
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardThumb: {
    width: "100%",
    height: "100%",
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
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
  cardTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  tagChip: {
    backgroundColor: C.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagChipText: {
    fontSize: 11,
    fontFamily: "NotoSansJP_500Medium",
    color: C.textSecondary,
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
