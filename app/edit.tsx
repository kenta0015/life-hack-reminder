import React, { useState, useEffect } from "react";
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
import type { LifeCardContent, NudgeContent, PlaybookContent } from "@/lib/types";
import { getTypeLabel, getItemTags } from "@/lib/types";
import Colors from "@/constants/colors";

const C = Colors.light;

export default function EditScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeItems, updateItem, deleteItem } = useApp();

  const item = activeItems.find((it) => it.id === id);

  const [phrase, setPhrase] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [nudgeText, setNudgeText] = useState("");
  const [playbookTitle, setPlaybookTitle] = useState("");
  const [steps, setSteps] = useState<string[]>(["", "", "", "", ""]);
  const [tagsInput, setTagsInput] = useState("");
  const [imagePickedUri, setImagePickedUri] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    if (item.type === "lifeCard") {
      const c = item.content as LifeCardContent;
      setPhrase(c.phrase);
      setTitle(c.title || "");
      setImageUrl(c.imageUrl || "");
      setImagePickedUri(null);
    } else if (item.type === "nudge") {
      const c = item.content as NudgeContent;
      setNudgeText(c.text);
      setImageUrl(c.imageUrl || "");
      setImagePickedUri(null);
    } else {
      const c = item.content as PlaybookContent;
      setPlaybookTitle(c.title);
      setImageUrl(c.imageUrl || "");
      setImagePickedUri(null);
      const padded = [...c.steps];
      while (padded.length < 5) padded.push("");
      setSteps(padded);
    }
    setTagsInput(getItemTags(item).join(", "));
  }, [item]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  if (!item) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <Text style={styles.errorText}>アイテムが見つかりません</Text>
      </View>
    );
  }

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const isValid = (): boolean => {
    if (item.type === "lifeCard") return phrase.trim().length > 0;
    if (item.type === "nudge") return nudgeText.trim().length > 0;
    if (item.type === "playbook") return playbookTitle.trim().length > 0;
    return false;
  };

  const parseTags = (s: string): string[] =>
    [...new Set(s.split(",").map((t) => t.trim()).filter(Boolean))];

  const handleSave = async () => {
    if (!isValid()) return;
    let content: LifeCardContent | NudgeContent | PlaybookContent;
    if (item.type === "lifeCard") {
      const finalImageUri = (imagePickedUri ?? imageUrl.trim()) || undefined;
      content = {
        phrase: phrase.trim(),
        title: title.trim() || undefined,
        imageUrl: finalImageUri,
      } as LifeCardContent;
    } else if (item.type === "nudge") {
      const finalImageUri = (imagePickedUri ?? imageUrl.trim()) || undefined;
      content = { text: nudgeText.trim(), imageUrl: finalImageUri } as NudgeContent;
    } else {
      const finalImageUri = (imagePickedUri ?? imageUrl.trim()) || undefined;
      content = {
        title: playbookTitle.trim(),
        steps: steps.filter((s) => s.trim().length > 0),
        imageUrl: finalImageUri,
      } as PlaybookContent;
    }
    const tags = parseTags(tagsInput);
    await updateItem(item.id, content, tags.length > 0 ? tags : undefined);
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const handleDelete = async () => {
    if (Platform.OS === "web") {
      if (confirm("このアイテムを削除ボックスに移動しますか？")) {
        await deleteItem(item.id);
        if (router.canGoBack()) router.back();
        else router.replace("/");
      }
    } else {
      Alert.alert("削除", "このアイテムを削除ボックスに移動しますか？", [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除する",
          style: "destructive",
          onPress: async () => {
            await deleteItem(item.id);
            if (router.canGoBack()) router.back();
            else router.replace("/");
          },
        },
      ]);
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
          <Text style={styles.navTitle}>
            {getTypeLabel(item.type)} を編集
          </Text>
          <Pressable onPress={handleSave} disabled={!isValid()} hitSlop={12}>
            <Ionicons
              name="checkmark"
              size={26}
              color={isValid() ? C.accent : C.textMuted}
            />
          </Pressable>
        </View>

        <Pressable
          style={styles.viewLink}
          onPress={() => router.push({ pathname: "/view", params: { id: item.id } })}
        >
          <Ionicons name="expand-outline" size={18} color={C.accent} />
          <Text style={styles.viewLinkText}>大きく見る</Text>
        </Pressable>

        <ScrollView
          style={styles.form}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {item.type === "lifeCard" && (
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
                {(imagePickedUri ?? imageUrl.trim()) ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image
                      source={{ uri: imagePickedUri ?? imageUrl.trim() }}
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

          {item.type === "nudge" && (
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
                {(imagePickedUri ?? imageUrl.trim()) ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image
                      source={{ uri: imagePickedUri ?? imageUrl.trim() }}
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

          {item.type === "playbook" && (
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
                {(imagePickedUri ?? imageUrl.trim()) ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image
                      source={{ uri: imagePickedUri ?? imageUrl.trim() }}
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

          <Pressable style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={C.danger} />
            <Text style={styles.deleteBtnText}>削除ボックスへ移動</Text>
          </Pressable>
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
  viewLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  viewLinkText: {
    fontSize: 14,
    fontFamily: "NotoSansJP_500Medium",
    color: C.accent,
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
    backgroundColor: "#0F3460",
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
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  deleteBtnText: {
    fontSize: 14,
    fontFamily: "NotoSansJP_500Medium",
    color: "#DC2626",
  },
  errorText: {
    fontSize: 16,
    fontFamily: "NotoSansJP_400Regular",
    color: C.textSecondary,
    textAlign: "center",
    marginTop: 60,
  },
});
