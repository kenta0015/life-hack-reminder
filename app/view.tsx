import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "@/lib/AppContext";
import type { LifeCardContent, NudgeContent, PlaybookContent } from "@/lib/types";
import { getTypeLabel } from "@/lib/types";
import Colors from "@/constants/colors";

const C = Colors.light;

const typeColors: Record<string, [string, string]> = {
  lifeCard: [C.accent, "#C53030"],
  nudge: [C.slate, C.deepNavy],
  playbook: [C.deepNavy, C.ink],
};

export default function ViewScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeItems } = useApp();

  const item = activeItems.find((it) => it.id === id);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  if (!item) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[C.ink, C.deepNavy]}
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          style={[
            styles.backBtn,
            {
              position: "absolute",
              left: 20,
              top: insets.top + webTopInset + 12,
              zIndex: 10,
            },
          ]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={28} color="rgba(255,255,255,0.8)" />
        </Pressable>
        <Text style={[styles.noItemText, { marginTop: insets.top + webTopInset + 80 }]}>
          アイテムが見つかりません
        </Text>
      </View>
    );
  }

  const gradientColors = typeColors[item.type] ?? [C.accent, C.ink];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View
        style={[
          styles.topArea,
          { paddingTop: insets.top + webTopInset + 12 },
        ]}
      >
        <Pressable
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={28} color="rgba(255,255,255,0.8)" />
        </Pressable>
        <View style={styles.typeLabelWrap}>
          <Text style={styles.typeLabel}>{getTypeLabel(item.type)}</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={[
          styles.mainContentInner,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {item.type === "lifeCard" && (
          <LifeCardDisplay content={item.content as LifeCardContent} />
        )}
        {item.type === "nudge" && (
          <NudgeDisplay content={item.content as NudgeContent} />
        )}
        {item.type === "playbook" && (
          <PlaybookDisplay content={item.content as PlaybookContent} />
        )}
      </ScrollView>

      <View
        style={[
          styles.editBar,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16,
          },
        ]}
      >
        <Pressable
          style={styles.editBtn}
          onPress={() =>
            router.push({ pathname: "/edit", params: { id: item.id } })
          }
        >
          <Ionicons name="pencil" size={20} color="#fff" />
          <Text style={styles.editBtnText}>編集</Text>
        </Pressable>
      </View>
    </View>
  );
}

function LifeCardDisplay({ content }: { content: LifeCardContent }) {
  return (
    <View style={styles.displayCenter}>
      {content.imageUrl ? (
        <Image
          source={{ uri: content.imageUrl }}
          style={styles.heroImage}
          contentFit="cover"
          transition={300}
        />
      ) : null}
      {content.title && (
        <Text style={styles.smallTitle}>{content.title}</Text>
      )}
      <Text style={styles.bigPhrase}>{content.phrase}</Text>
    </View>
  );
}

function NudgeDisplay({ content }: { content: NudgeContent }) {
  return (
    <View style={styles.displayCenter}>
      {content.imageUrl ? (
        <Image
          source={{ uri: content.imageUrl }}
          style={styles.heroImage}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <Ionicons
          name="chatbubble-ellipses"
          size={48}
          color="rgba(255,255,255,0.3)"
          style={{ marginBottom: 20 }}
        />
      )}
      <Text style={styles.bigPhrase}>{content.text}</Text>
    </View>
  );
}

function PlaybookDisplay({ content }: { content: PlaybookContent }) {
  return (
    <View style={styles.displayCenter}>
      {content.imageUrl ? (
        <Image
          source={{ uri: content.imageUrl }}
          style={styles.heroImage}
          contentFit="cover"
          transition={300}
        />
      ) : null}
      <Text style={styles.bigTitle}>{content.title}</Text>
      <View style={styles.stepsContainer}>
        {content.steps.map((step, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={styles.stepBullet}>
              <Text style={styles.stepBulletText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  typeLabelWrap: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
  },
  typeLabel: {
    fontSize: 12,
    fontFamily: "NotoSansJP_500Medium",
    color: "rgba(255,255,255,0.8)",
  },
  mainContent: {
    flex: 1,
  },
  mainContentInner: {
    paddingHorizontal: 28,
    justifyContent: "center",
    minHeight: "70%" as any,
  },
  displayCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  heroImage: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: 20,
    marginBottom: 28,
  },
  smallTitle: {
    fontSize: 14,
    fontFamily: "NotoSansJP_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 12,
    textAlign: "center",
  },
  bigPhrase: {
    fontSize: 28,
    fontFamily: "NotoSansJP_700Bold",
    color: "#fff",
    textAlign: "center",
    lineHeight: 42,
  },
  bigTitle: {
    fontSize: 26,
    fontFamily: "NotoSansJP_700Bold",
    color: "#fff",
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 30,
  },
  stepsContainer: {
    width: "100%",
    gap: 14,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  stepBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepBulletText: {
    fontSize: 14,
    fontFamily: "NotoSansJP_700Bold",
    color: "#fff",
  },
  stepText: {
    flex: 1,
    fontSize: 17,
    fontFamily: "NotoSansJP_400Regular",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 26,
  },
  editBar: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 28,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  editBtnText: {
    fontSize: 15,
    fontFamily: "NotoSansJP_500Medium",
    color: "#fff",
  },
  noItemText: {
    fontSize: 16,
    fontFamily: "NotoSansJP_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 60,
  },
});
