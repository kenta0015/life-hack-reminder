import ExpoModulesCore
import Foundation

public class WidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoWidgetBridge")

    AsyncFunction("copyImageToWidget") { (sourceUri: String, appGroup: String) -> String? in
      guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else {
        return nil
      }
      let destURL = containerURL.appendingPathComponent("widgetImage.jpg")
      let sourceURL: URL
      if sourceUri.hasPrefix("file://") {
        sourceURL = URL(string: sourceUri) ?? URL(fileURLWithPath: sourceUri)
      } else {
        sourceURL = URL(fileURLWithPath: sourceUri)
      }
      let sourcePath = sourceURL.path
      guard FileManager.default.fileExists(atPath: sourcePath) else {
        return nil
      }
      try? FileManager.default.removeItem(at: destURL)
      do {
        try FileManager.default.copyItem(at: sourceURL, to: destURL)
        return destURL.path
      } catch {
        return nil
      }
    }

    AsyncFunction("clearWidgetImage") { (appGroup: String) in
      guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else {
        return
      }
      let fileURL = containerURL.appendingPathComponent("widgetImage.jpg")
      try? FileManager.default.removeItem(at: fileURL)
    }
  }
}
