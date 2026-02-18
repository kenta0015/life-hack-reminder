import { requireNativeModule } from "expo-modules-core";

const WidgetBridgeModule = requireNativeModule("ExpoWidgetBridge");

export function copyImageToWidget(sourceUri: string, appGroup: string): Promise<string | null> {
  return WidgetBridgeModule.copyImageToWidget(sourceUri, appGroup);
}

export function clearWidgetImage(appGroup: string): Promise<void> {
  return WidgetBridgeModule.clearWidgetImage(appGroup);
}
