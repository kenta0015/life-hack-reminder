import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useApp } from "@/lib/AppContext";
import { getItemMainText, getTypeLabel } from "@/lib/types";
import type { DeleteBoxItem } from "@/lib/types";
import Colors from "@/constants/colors";

const C = Colors.light;

function DeletedItemCard({
  item,
  onRestore,
  onPermanentDelete,
}: {
  item: DeleteBoxItem;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const remainingDays = Math.max(
    0,
    Math.ceil((item.deletedAt + 30 * 86400000 - Date.now()) / 86400000)
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{getTypeLabel(item.type)}</Text>
        </View>
        <Text style={styles.remainingText}>
          残り{remainingDays}日
        </Text>
      </View>
      <Text style={styles.cardMainText} numberOfLines={2}>
        {getItemMainText(item)}
      </Text>
      <View style={styles.cardActions}>
        <Pressable style={styles.restoreBtn} onPress={onRestore}>
          <Ionicons name="refresh" size={16} color={C.slate} />
          <Text style={styles.restoreBtnText}>復活</Text>
        </Pressable>
        <Pressable style={styles.permDeleteBtn} onPress={onPermanentDelete}>
          <Ionicons name="trash" size={16} color={C.danger} />
          <Text style={styles.permDeleteBtnText}>完全削除</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function DeleteBoxScreen() {
  const insets = useSafeAreaInsets();
  const { deleteBox, activeItems, restoreItem, permanentDelete } = useApp();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleRestore = (itemId: string) => {
    if (activeItems.length >= 10) {
      router.push({
        pathname: "/replace-select",
        params: { mode: "restore", restoreId: itemId },
      });
    } else {
      restoreItem(itemId);
    }
  };

  const handlePermanentDelete = (itemId: string) => {
    if (Platform.OS === "web") {
      if (confirm("完全に削除しますか？この操作は取り消せません。")) {
        permanentDelete(itemId);
      }
    } else {
      Alert.alert("完全削除", "この操作は取り消せません。", [
        { text: "キャンセル", style: "cancel" },
        {
          text: "完全に削除",
          style: "destructive",
          onPress: () => permanentDelete(itemId),
        },
      ]);
    }
  };

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
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </Pressable>
        <Text style={styles.navTitle}>削除ボックス</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>
        削除から30日で自動的に完全削除されます
      </Text>

      <FlatList
        data={deleteBox}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <DeletedItemCard
            item={item}
            onRestore={() => handleRestore(item.id)}
            onPermanentDelete={() => handlePermanentDelete(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="trash-2" size={48} color={C.textMuted} />
            <Text style={styles.emptyText}>
              削除ボックスは空です
            </Text>
          </View>
        }
      />
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
  subtitle: {
    fontSize: 12,
    fontFamily: "NotoSansJP_400Regular",
    color: C.textMuted,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
    backgroundColor: C.textMuted,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: "NotoSansJP_500Medium",
    color: "#fff",
  },
  remainingText: {
    fontSize: 12,
    fontFamily: "NotoSansJP_500Medium",
    color: C.warning,
  },
  cardMainText: {
    fontSize: 15,
    fontFamily: "NotoSansJP_500Medium",
    color: C.textPrimary,
    lineHeight: 22,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
  restoreBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  restoreBtnText: {
    fontSize: 13,
    fontFamily: "NotoSansJP_500Medium",
    color: C.slate,
  },
  permDeleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  permDeleteBtnText: {
    fontSize: 13,
    fontFamily: "NotoSansJP_500Medium",
    color: C.danger,
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
});
