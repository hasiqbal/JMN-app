import ExpoModulesCore
import Foundation
import WidgetKit

private let appGroup = "group.com.jmnapp.shared"
private let payloadKey = "jmn.widget.homePrayer.payload"
private let widgetKind = "HomePrayerHeroWidget"

public class ReactNativeWidgetExtensionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReactNativeWidgetExtension")

    // Kept for compatibility with the package JS API.
    Function("areActivitiesEnabled") { () -> Bool in
      return false
    }

    // No-op placeholders to keep package methods callable.
    AsyncFunction("startActivity") { (_ progress: Int, _ title: String, _ amount: String, _ subtitle: String, _ latitude: Double, _ longitude: Double) in
      return
    }

    AsyncFunction("updateActivity") { (_ progress: Int, _ title: String, _ amount: String, _ subtitle: String, _ latitude: Double, _ longitude: Double) in
      return
    }

    AsyncFunction("endActivity") { () in
      return
    }

    // App-specific widget sync API used by JS.
    AsyncFunction("setHomePrayerWidgetPayload") { (payloadJson: String) in
      guard let sharedDefaults = UserDefaults(suiteName: appGroup) else {
        return
      }

      sharedDefaults.set(payloadJson, forKey: payloadKey)
      sharedDefaults.synchronize()
    }

    AsyncFunction("reloadHomePrayerWidget") { () in
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
      }
    }

    AsyncFunction("reloadAllWidgets") { () in
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }
}
