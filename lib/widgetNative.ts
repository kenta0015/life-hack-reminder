import { Platform } from "react-native";
import type { WidgetPayload } from "./widget";

const APP_GROUP_ID = "group.com.kenta0015.life-hack-reminder";

/**
 * ウィジェット用データを App Group の UserDefaults に書き出し、画像があれば共有コンテナにコピーする。
 * iOS の development build でのみ動作。Expo Go / Web では何もしない。
 */
export async function writeWidgetDataToNative(payload: WidgetPayload): Promise<void> {
  if (Platform.OS !== "ios") return;

  try {
    const { ExtensionStorage } = await import("@bacons/apple-targets");
    const { copyImageToWidget, clearWidgetImage } = await import(
      "@/modules/expo-widget-bridge"
    );

    const storage = new ExtensionStorage(APP_GROUP_ID);

    storage.set("widgetPhrase", payload.phrase);
    storage.set("widgetTitle", payload.title ?? "");
    storage.set("widgetType", payload.type);
    storage.set("widgetUpdatedAt", payload.updatedAt);

    if (payload.imageUri?.trim()) {
      const path = await copyImageToWidget(payload.imageUri.trim(), APP_GROUP_ID);
      storage.set("widgetImagePath", path ?? "");
    } else {
      await clearWidgetImage(APP_GROUP_ID);
      storage.remove("widgetImagePath");
    }

    ExtensionStorage.reloadWidget();
  } catch {
    // Expo Go やネイティブモジュール未リンク時は無視
  }
}

export { APP_GROUP_ID };
