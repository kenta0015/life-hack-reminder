import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/lib/AppContext";
import { getItemMainText, getTypeLabel } from "@/lib/types";
import type { ActiveItem } from "@/lib/types";
import Colors from "@/constants/colors";

const C = Colors.light;

export default function ReplaceSelectScreen() {
  const insets = useSafeAreaInsets();
  const { mode, restoreId } = useLocalSearchParams<{
    mode: "addNew" | "restore";
    restoreId?: string;
  }>();
  const { activeItems, replaceAndRestore } = useApp();

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleSelect = async (oldId: string) => {
    if (mode === "addNew") {
      router.replace({ pathname: "/add", params: { replaceId: oldId } });
    } else if (mode === "restore" && restoreId) {
      await replaceAndRestore(oldId, restoreId);
      if (router.canGoBack()) router.back();
      else router.replace("/");
    }
  };

  const renderItem = ({ item }: { item: ActiveItem }) => {
    const typeColors: Record<string, string> = {
      lifeCard: C.accent,
      nudge: C.slate,
      playbook: C.deepNavy,
    };

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
        onPress={() => handleSelect(item.id)}
      >
        <View style={styles.cardRow}>
          <View
            style={[
              styles.typeDot,
              { backgroundColor: typeColors[item.type] || C.accent },
            ]}
          />
          <View style={styles.cardContent}>
            <Text style={styles.typeText}>{getTypeLabel(item.type)}</Text>
            <Text style={styles.mainText} numberOfLines={2}>
              {getItemMainText(item)}
            </Text>
          </View>
          <Ionicons name="swap-horizontal" size={20} color={C.textMuted} />
        </View>
      </Pressable>
    );
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
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/")} hitSlop={12}>
          <Ionicons name="close" size={24} color={C.ink} />
        </Pressable>
        <Text style={styles.navTitle}>入れ替え先を選択</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>
        10個の上限に達しています。入れ替えたいアイテムをタップしてください。選んだアイテムは削除ボックスへ移動します。
      </Text>

      <FlatList
        data={activeItems}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
    fontSize: 13,
    fontFamily: "NotoSansJP_400Regular",
    color: C.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 16,
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: C.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardContent: {
    flex: 1,
  },
  typeText: {
    fontSize: 11,
    fontFamily: "NotoSansJP_500Medium",
    color: C.textMuted,
    marginBottom: 2,
  },
  mainText: {
    fontSize: 14,
    fontFamily: "NotoSansJP_500Medium",
    color: C.textPrimary,
    lineHeight: 20,
  },
});
