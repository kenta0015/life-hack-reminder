import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/lib/AppContext";
import { pickImageAndCopyToApp } from "@/lib/imagePicker";
import type { ItemType, LifeCardContent, NudgeContent, PlaybookContent } from "@/lib/types";
import Colors from "@/constants/colors";

const C = Colors.light;

const TYPES: { key: ItemType; label: string; icon: string }[] = [
  { key: "lifeCard", label: "Life Card", icon: "sparkles" },
  { key: "nudge", label: "Nudge", icon: "chatbubble-ellipses" },
  { key: "playbook", label: "Playbook", icon: "list" },
];

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ replaceId?: string }>();
  const { addItem, replaceAndAdd, activeItems } = useApp();

  const [selectedType, setSelectedType] = useState<ItemType>("lifeCard");
  const [phrase, setPhrase] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [nudgeText, setNudgeText] = useState("");
  const [playbookTitle, setPlaybookTitle] = useState("");
  const [steps, setSteps] = useState<string[]>(["", "", "", "", ""]);
  const [tagsInput, setTagsInput] = useState("");
  const [imagePickedUri, setImagePickedUri] = useState<string | null>(null);
  const [nudgeImageUrl, setNudgeImageUrl] = useState("");
  const [nudgeImagePickedUri, setNudgeImagePickedUri] = useState<string | null>(null);
  const [playbookImageUrl, setPlaybookImageUrl] = useState("");
  const [playbookImagePickedUri, setPlaybookImagePickedUri] = useState<string | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const parseTags = (s: string): string[] => {
    return [...new Set(s.split(",").map((t) => t.trim()).filter(Boolean))];
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const isValid = (): boolean => {
    if (selectedType === "lifeCard") return phrase.trim().length > 0;
    if (selectedType === "nudge") return nudgeText.trim().length > 0;
    if (selectedType === "playbook") return playbookTitle.trim().length > 0;
    return false;
  };

  const handleSave = async () => {
    if (!isValid()) return;

    let content: LifeCardContent | NudgeContent | PlaybookContent;

    if (selectedType === "lifeCard") {
      const finalImageUri = imagePickedUri || imageUrl.trim() || undefined;
      content = {
        phrase: phrase.trim(),
        title: title.trim() || undefined,
        imageUrl: finalImageUri,
      } as LifeCardContent;
    } else if (selectedType === "nudge") {
      const nudgeImg = nudgeImagePickedUri || nudgeImageUrl.trim() || undefined;
      content = { text: nudgeText.trim(), imageUrl: nudgeImg } as NudgeContent;
    } else {
      const pbImg = playbookImagePickedUri || playbookImageUrl.trim() || undefined;
      content = {
        title: playbookTitle.trim(),
        steps: steps.filter((s) => s.trim().length > 0),
        imageUrl: pbImg,
      } as PlaybookContent;
    }

    const tags = parseTags(tagsInput);
    if (params.replaceId) {
      await replaceAndAdd(params.replaceId, selectedType, content, tags.length > 0 ? tags : undefined);
    } else if (activeItems.length >= 10) {
      Alert.alert("上限", "現存アイテムが10個です。先に入れ替え先を選んでください。");
      return;
    } else {
      await addItem(selectedType, content, tags.length > 0 ? tags : undefined);
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
          <Text style={styles.navTitle}>新規追加</Text>
          <Pressable
            onPress={handleSave}
            disabled={!isValid()}
            hitSlop={12}
          >
            <Ionicons
              name="checkmark"
              size={26}
              color={isValid() ? C.accent : C.textMuted}
            />
          </Pressable>
        </View>

        <View style={styles.typeTabs}>
          {TYPES.map((t) => (
            <Pressable
              key={t.key}
              style={[
                styles.typeTab,
                selectedType === t.key && styles.typeTabActive,
              ]}
              onPress={() => setSelectedType(t.key)}
            >
              <Ionicons
                name={t.icon as any}
                size={16}
                color={selectedType === t.key ? "#fff" : C.textSecondary}
              />
              <Text
                style={[
                  styles.typeTabText,
                  selectedType === t.key && styles.typeTabTextActive,
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          style={styles.form}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {selectedType === "lifeCard" && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>言葉 *</Text>
                <TextInput
                  style={styles.input}
                  value={phrase}
                  onChangeText={setPhrase}
                  placeholder="心に響く一言を入力..."
                  placeholderTextColor={C.textMuted}
                  multiline
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>タイトル（任意）</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="タイトルがあれば入力"
                  placeholderTextColor={C.textMuted}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>画像（任意）</Text>
                <Pressable
                  style={styles.pickImageBtn}
                  onPress={async () => {
                    try {
                      const uri = await pickImageAndCopyToApp();
                      if (uri) setImagePickedUri(uri);
                      else if (Platform.OS !== "web") {
                        Alert.alert("写真を選べませんでした", "フォトライブラリの利用が許可されていないか、キャンセルしました。");
                      }
                    } catch {
                      if (Platform.OS !== "web") {
                        Alert.alert("写真を選べませんでした", "エラーが発生しました。もう一度お試しください。");
                      }
                    }
                  }}
                >
                  <Ionicons name="image-outline" size={22} color={C.accent} />
                  <Text style={styles.pickImageBtnText}>写真を選ぶ</Text>
                </Pressable>
                {(imagePickedUri || imageUrl.trim()) ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image
                      source={{ uri: imagePickedUri || imageUrl.trim() }}
                      style={styles.imagePreview}
                      contentFit="cover"
                    />
                    <Pressable
                      style={styles.removeImageBtn}
                      onPress={() => {
                        setImagePickedUri(null);
                        setImageUrl("");
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color={C.danger} />
                    </Pressable>
                  </View>
                ) : null}
                <Text style={styles.labelHint}>または URL を入力</Text>
                <TextInput
                  style={[styles.input, { marginTop: 4 }]}
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                  editable={!imagePickedUri}
                />
              </View>
            </>
          )}

          {selectedType === "nudge" && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>テキスト *</Text>
                <TextInput
                  style={styles.input}
                  value={nudgeText}
                  onChangeText={setNudgeText}
                  placeholder="思い出したいコツを1行で..."
                  placeholderTextColor={C.textMuted}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>画像（任意）</Text>
                <Pressable
                  style={styles.pickImageBtn}
                  onPress={async () => {
                    try {
                      const uri = await pickImageAndCopyToApp();
                      if (uri) setNudgeImagePickedUri(uri);
                      else if (Platform.OS !== "web") {
                        Alert.alert("写真を選べませんでした", "フォトライブラリの利用が許可されていないか、キャンセルしました。");
                      }
                    } catch {
                      if (Platform.OS !== "web") {
                        Alert.alert("写真を選べませんでした", "エラーが発生しました。もう一度お試しください。");
                      }
                    }
                  }}
                >
                  <Ionicons name="image-outline" size={22} color={C.accent} />
                  <Text style={styles.pickImageBtnText}>写真を選ぶ</Text>
                </Pressable>
                {(nudgeImagePickedUri || nudgeImageUrl.trim()) ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image
                      source={{ uri: nudgeImagePickedUri || nudgeImageUrl.trim() }}
                      style={styles.imagePreview}
                      contentFit="cover"
                    />
                    <Pressable
                      style={styles.removeImageBtn}
                      onPress={() => {
                        setNudgeImagePickedUri(null);
                        setNudgeImageUrl("");
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color={C.danger} />
                    </Pressable>
                  </View>
                ) : null}
                <Text style={styles.labelHint}>または URL を入力</Text>
                <TextInput
                  style={[styles.input, { marginTop: 4 }]}
                  value={nudgeImageUrl}
                  onChangeText={setNudgeImageUrl}
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                  editable={!nudgeImagePickedUri}
                />
              </View>
            </>
          )}

          {selectedType === "playbook" && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>タイトル *</Text>
                <TextInput
                  style={styles.input}
                  value={playbookTitle}
                  onChangeText={setPlaybookTitle}
                  placeholder="手順のタイトル"
                  placeholderTextColor={C.textMuted}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>画像（任意）</Text>
                <Pressable
                  style={styles.pickImageBtn}
                  onPress={async () => {
                    try {
                      const uri = await pickImageAndCopyToApp();
                      if (uri) setPlaybookImagePickedUri(uri);
                      else if (Platform.OS !== "web") {
                        Alert.alert("写真を選べませんでした", "フォトライブラリの利用が許可されていないか、キャンセルしました。");
                      }
                    } catch {
                      if (Platform.OS !== "web") {
                        Alert.alert("写真を選べませんでした", "エラーが発生しました。もう一度お試しください。");
                      }
                    }
                  }}
                >
                  <Ionicons name="image-outline" size={22} color={C.accent} />
                  <Text style={styles.pickImageBtnText}>写真を選ぶ</Text>
                </Pressable>
                {(playbookImagePickedUri || playbookImageUrl.trim()) ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image
                      source={{ uri: playbookImagePickedUri || playbookImageUrl.trim() }}
                      style={styles.imagePreview}
                      contentFit="cover"
                    />
                    <Pressable
                      style={styles.removeImageBtn}
                      onPress={() => {
                        setPlaybookImagePickedUri(null);
                        setPlaybookImageUrl("");
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color={C.danger} />
                    </Pressable>
                  </View>
                ) : null}
                <Text style={styles.labelHint}>または URL を入力</Text>
                <TextInput
                  style={[styles.input, { marginTop: 4 }]}
                  value={playbookImageUrl}
                  onChangeText={setPlaybookImageUrl}
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                  editable={!playbookImagePickedUri}
                />
              </View>
              <Text style={styles.label}>手順（最大5行）</Text>
              {steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={step}
                    onChangeText={(v) => updateStep(i, v)}
                    placeholder={`ステップ ${i + 1}`}
                    placeholderTextColor={C.textMuted}
                  />
                </View>
              ))}
            </>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>タグ（任意）</Text>
            <TextInput
              style={styles.input}
              value={tagsInput}
              onChangeText={setTagsInput}
              placeholder="例: 仕事, モチベ, 人間関係"
              placeholderTextColor={C.textMuted}
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  typeTabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  typeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.border,
  },
  typeTabActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  typeTabText: {
    fontSize: 12,
    fontFamily: "NotoSansJP_500Medium",
    color: C.textSecondary,
  },
  typeTabTextActive: {
    color: "#fff",
  },
  form: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: "NotoSansJP_500Medium",
    color: C.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "NotoSansJP_400Regular",
    color: C.textPrimary,
    minHeight: 48,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.slate,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 12,
    fontFamily: "NotoSansJP_700Bold",
    color: "#fff",
  },
  pickImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.accent,
    backgroundColor: `${C.accent}10`,
  },
  pickImageBtnText: {
    fontSize: 15,
    fontFamily: "NotoSansJP_500Medium",
    color: C.accent,
  },
  imagePreviewWrap: {
    position: "relative",
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  imagePreview: {
    width: 200,
    height: 125,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
  },
  labelHint: {
    fontSize: 12,
    fontFamily: "NotoSansJP_400Regular",
    color: C.textMuted,
    marginTop: 12,
    marginBottom: 4,
  },
});
