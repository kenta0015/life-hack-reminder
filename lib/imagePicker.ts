import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";

const IMAGE_DIR = "life-hack-images";

/** iOS の tmp 由来の URI か（copyAsync が tmp で失敗するためスキップする） */
function isTmpUri(uri: string): boolean {
  return /\/tmp\/|^file:\/\/.*\/tmp\//.test(uri);
}

/**
 * フォトライブラリから1枚選び、アプリのドキュメントディレクトリにコピーして返す。
 * キャンセル時は null。Web ではピッカーの URI をそのまま返す。
 * iOS で tmp の URI の場合は copyAsync を呼ばずその URI を返す（白画面・失敗を防ぐ）。
 */
export async function pickImageAndCopyToApp(): Promise<string | null> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return null;
    }

    const sourceUri = result.assets[0].uri;

    // Web の場合は blob URL など永続化できないのでそのまま返す
    if (Platform.OS === "web" || sourceUri.startsWith("blob:") || sourceUri.startsWith("data:")) {
      return sourceUri;
    }

    // iOS で tmp の URI の場合は copyAsync をスキップ（tmp からのコピーは iOS で失敗する既知の不具合）
    if (Platform.OS === "ios" && isTmpUri(sourceUri)) {
      return sourceUri;
    }

    try {
      const FileSystem = await import("expo-file-system/legacy");
      const dir = `${FileSystem.documentDirectory}${IMAGE_DIR}`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const ext = sourceUri.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${Crypto.randomUUID()}.${ext}`;
      const destUri = `${dir}/${filename}`;
      await FileSystem.copyAsync({ from: sourceUri, to: destUri });
      return destUri;
    } catch {
      return sourceUri;
    }
  } catch {
    return null;
  }
}
