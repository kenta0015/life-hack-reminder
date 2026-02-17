import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
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

export default function DoomScreen() {
  const insets = useSafeAreaInsets();
  const { deliveryId } = useLocalSearchParams<{ deliveryId: string }>();
  const { activeItems, deliveries, recordFeedback, deleteItem, reduceNoCount } = useApp();
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const delivery = useMemo(
    () => deliveries.find((d) => d.id === deliveryId) || null,
    [deliveries, deliveryId]
  );
  const item = useMemo(
    () =>
      delivery
        ? activeItems.find((it) => it.id === delivery.itemId) || null
        : null,
    [activeItems, delivery]
  );

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  if (!delivery || !item) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <LinearGradient
          colors={[C.ink, C.deepNavy]}
          style={StyleSheet.absoluteFill}
        />
        <Pressable style={styles.closeBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/")}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.noItemText}>配信アイテムがありません</Text>
      </View>
    );
  }

  const showFeedback =
    delivery.feedbackAsked && !delivery.feedbackGiven && !feedbackGiven;

  const handleFeedback = async (feedback: "YES" | "NO" | "SKIP") => {
    const result = await recordFeedback(delivery.id, feedback);
    setFeedbackGiven(true);

    if (feedback === "NO" && result.shouldPromptDelete) {
      if (Platform.OS === "web") {
        if (confirm("NOが5回になりました。このアイテムを削除しますか？")) {
          await deleteItem(item.id);
          if (router.canGoBack()) router.back();
          else router.replace("/");
        } else {
          await reduceNoCount(item.id);
        }
      } else {
        Alert.alert(
          "削除しますか？",
          "NOが5回になりました。このアイテムを削除ボックスに移動しますか？",
          [
            {
              text: "削除しない",
              style: "cancel",
              onPress: async () => {
                await reduceNoCount(item.id);
              },
            },
            {
              text: "削除する",
              style: "destructive",
              onPress: async () => {
                await deleteItem(item.id);
                if (router.canGoBack()) router.back();
                else router.replace("/");
              },
            },
          ]
        );
      }
    }
  };

  const typeColors: Record<string, [string, string]> = {
    lifeCard: [C.accent, "#C53030"],
    nudge: [C.slate, C.deepNavy],
    playbook: [C.deepNavy, C.ink],
  };
  const gradientColors = typeColors[item.type] || [C.accent, C.ink];

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
          style={styles.closeBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
          hitSlop={12}
        >
          <Ionicons name="close" size={28} color="rgba(255,255,255,0.8)" />
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
              insets.bottom + (Platform.OS === "web" ? 34 : 0) + 120,
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

      {showFeedback && (
        <View
          style={[
            styles.feedbackBar,
            {
              paddingBottom:
                insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16,
            },
          ]}
        >
          <Text style={styles.feedbackQuestion}>役に立った？</Text>
          <View style={styles.feedbackButtons}>
            <Pressable
              style={[styles.fbBtn, { backgroundColor: "rgba(52,211,153,0.2)" }]}
              onPress={() => handleFeedback("YES")}
            >
              <Ionicons name="checkmark-circle" size={28} color={C.success} />
              <Text style={[styles.fbBtnText, { color: C.success }]}>YES</Text>
            </Pressable>
            <Pressable
              style={[styles.fbBtn, { backgroundColor: "rgba(148,163,184,0.2)" }]}
              onPress={() => handleFeedback("SKIP")}
            >
              <Ionicons name="remove-circle" size={28} color="#CBD5E1" />
              <Text style={[styles.fbBtnText, { color: "#CBD5E1" }]}>SKIP</Text>
            </Pressable>
            <Pressable
              style={[styles.fbBtn, { backgroundColor: "rgba(239,68,68,0.2)" }]}
              onPress={() => handleFeedback("NO")}
            >
              <Ionicons name="close-circle" size={28} color={C.danger} />
              <Text style={[styles.fbBtnText, { color: C.danger }]}>NO</Text>
            </Pressable>
          </View>
        </View>
      )}

      {feedbackGiven && (
        <View
          style={[
            styles.feedbackBar,
            {
              paddingBottom:
                insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16,
            },
          ]}
        >
          <Text style={styles.thankYouText}>回答ありがとう！</Text>
        </View>
      )}
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
      <Ionicons
        name="chatbubble-ellipses"
        size={48}
        color="rgba(255,255,255,0.3)"
        style={{ marginBottom: 20 }}
      />
      <Text style={styles.bigPhrase}>{content.text}</Text>
    </View>
  );
}

function PlaybookDisplay({ content }: { content: PlaybookContent }) {
  return (
    <View style={styles.displayCenter}>
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
  closeBtn: {
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
  feedbackBar: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingHorizontal: 28,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  feedbackQuestion: {
    fontSize: 16,
    fontFamily: "NotoSansJP_700Bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
  },
  feedbackButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  fbBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: 80,
  },
  fbBtnText: {
    fontSize: 13,
    fontFamily: "NotoSansJP_700Bold",
  },
  thankYouText: {
    fontSize: 16,
    fontFamily: "NotoSansJP_500Medium",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    paddingBottom: 10,
  },
  noItemText: {
    fontSize: 16,
    fontFamily: "NotoSansJP_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 60,
  },
});
