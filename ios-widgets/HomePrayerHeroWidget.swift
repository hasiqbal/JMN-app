import SwiftUI
import WidgetKit

private let appGroup = "group.com.jmnapp.shared"
private let payloadKey = "jmn.widget.homePrayer.payload"

struct HomePrayerRow: Codable {
  let name: String
  let time: String
  let iqamah: String
}

struct HomePrayerPayload: Codable {
  let dateLine: String
  let hijriLine: String
  let nextPrayerLine: String
  let nextPrayerName: String
  let nextPrayerTime: String
  let prayers: [HomePrayerRow]
  let updatedAtIso: String
}

struct HomePrayerEntry: TimelineEntry {
  let date: Date
  let payload: HomePrayerPayload
}

private extension HomePrayerPayload {
  static func fallback() -> HomePrayerPayload {
    HomePrayerPayload(
      dateLine: "Today",
      hijriLine: "Hijri date unavailable",
      nextPrayerLine: "--",
      nextPrayerName: "--",
      nextPrayerTime: "--:--",
      prayers: [
        HomePrayerRow(name: "Fajr", time: "--:--", iqamah: "--:--"),
        HomePrayerRow(name: "Dhuhr", time: "--:--", iqamah: "--:--"),
        HomePrayerRow(name: "Asr", time: "--:--", iqamah: "--:--"),
        HomePrayerRow(name: "Maghrib", time: "--:--", iqamah: "--:--"),
        HomePrayerRow(name: "Isha", time: "--:--", iqamah: "--:--")
      ],
      updatedAtIso: ISO8601DateFormatter().string(from: Date())
    )
  }
}

struct HomePrayerProvider: TimelineProvider {
  func placeholder(in context: Context) -> HomePrayerEntry {
    HomePrayerEntry(date: Date(), payload: .fallback())
  }

  func getSnapshot(in context: Context, completion: @escaping (HomePrayerEntry) -> Void) {
    completion(HomePrayerEntry(date: Date(), payload: readPayload()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<HomePrayerEntry>) -> Void) {
    let entry = HomePrayerEntry(date: Date(), payload: readPayload())
    let refreshDate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
    completion(Timeline(entries: [entry], policy: .after(refreshDate)))
  }

  private func readPayload() -> HomePrayerPayload {
    guard let sharedDefaults = UserDefaults(suiteName: appGroup),
          let payloadJson = sharedDefaults.string(forKey: payloadKey),
          let data = payloadJson.data(using: .utf8) else {
      return .fallback()
    }

    do {
      return try JSONDecoder().decode(HomePrayerPayload.self, from: data)
    } catch {
      return .fallback()
    }
  }
}

struct HomePrayerHeroWidgetEntryView: View {
  var entry: HomePrayerProvider.Entry

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(entry.payload.nextPrayerName)
        .font(.headline)
        .foregroundColor(.white)

      Text(entry.payload.nextPrayerTime)
        .font(.system(size: 28, weight: .bold))
        .foregroundColor(.white)

      Text(entry.payload.hijriLine)
        .font(.caption)
        .foregroundColor(Color.white.opacity(0.85))

      Divider()
        .overlay(Color.white.opacity(0.25))

      HStack(spacing: 8) {
        ForEach(entry.payload.prayers.prefix(3), id: \.name) { prayer in
          VStack(alignment: .leading, spacing: 2) {
            Text(prayer.name)
              .font(.caption2)
              .foregroundColor(Color.white.opacity(0.75))
            Text(prayer.time)
              .font(.caption)
              .foregroundColor(.white)
          }
        }
      }
    }
    .padding()
    .background(
      LinearGradient(
        colors: [Color(red: 0.04, green: 0.17, blue: 0.13), Color(red: 0.07, green: 0.23, blue: 0.18)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    )
  }
}

struct HomePrayerHeroWidget: Widget {
  let kind: String = "HomePrayerHeroWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: HomePrayerProvider()) { entry in
      HomePrayerHeroWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("JMN Prayer Times")
    .description("Shows the next prayer and key prayer times.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
