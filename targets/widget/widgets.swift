import WidgetKit
import SwiftUI

private let appGroupId = "group.com.kenta0015.life-hack-reminder"

// MARK: - Data from App Group

struct LifeHackEntry: TimelineEntry {
    let date: Date
    let phrase: String
    let title: String?
    let widgetType: String
    let imagePath: String?
    let updatedAt: Int
}

// MARK: - Provider (reads UserDefaults, next refresh at midnight)

struct LifeHackProvider: TimelineProvider {
    func placeholder(in context: Context) -> LifeHackEntry {
        LifeHackEntry(
            date: Date(),
            phrase: "今日の1枚",
            title: nil,
            widgetType: "lifeCard",
            imagePath: nil,
            updatedAt: 0
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (LifeHackEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LifeHackEntry>) -> Void) {
        let entry = loadEntry()
        let calendar = Calendar.current
        let now = Date()
        let nextMidnight = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: now)!)
        let timeline = Timeline(entries: [entry], policy: .after(nextMidnight))
        completion(timeline)
    }

    private func loadEntry() -> LifeHackEntry {
        let defaults = UserDefaults(suiteName: appGroupId)
        let phrase = defaults?.string(forKey: "widgetPhrase") ?? "今日の1枚"
        let title = defaults?.string(forKey: "widgetTitle")
        let widgetType = defaults?.string(forKey: "widgetType") ?? "lifeCard"
        let imagePath = defaults?.string(forKey: "widgetImagePath").flatMap { path in
            path.isEmpty ? nil : path
        }
        let updatedAt = defaults?.integer(forKey: "widgetUpdatedAt") ?? 0
        return LifeHackEntry(
            date: Date(),
            phrase: phrase,
            title: title,
            widgetType: widgetType,
            imagePath: imagePath,
            updatedAt: updatedAt
        )
    }
}

// MARK: - View (gradient + image + phrase, doom-style)

struct LifeHackWidgetView: View {
    var entry: LifeHackEntry

    private var gradientColors: [Color] {
        switch entry.widgetType {
        case "nudge": return [Color(red: 0.45, green: 0.48, blue: 0.55), Color(red: 0.15, green: 0.22, blue: 0.4)]
        case "playbook": return [Color(red: 0.15, green: 0.22, blue: 0.4), Color(red: 0.05, green: 0.05, blue: 0.1)]
        default: return [Color(red: 0.2, green: 0.85, blue: 0.6), Color(red: 0.77, green: 0.19, blue: 0.19)]
        }
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: gradientColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 8) {
                if let path = entry.imagePath, !path.isEmpty, let uiImage = UIImage(contentsOfFile: path) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(maxWidth: .infinity)
                        .frame(height: 80)
                        .clipped()
                        .cornerRadius(12)
                }
                if let title = entry.title, !title.isEmpty {
                    Text(title)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.8))
                        .lineLimit(1)
                }
                Text(entry.phrase)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(entry.imagePath != nil ? 2 : 4)
                    .minimumScaleFactor(0.7)
            }
            .padding(12)
        }
        .containerBackground(.clear, for: .widget)
    }
}

// MARK: - Widget

struct widget: Widget {
    let kind: String = "LifeHackWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeHackProvider()) { entry in
            LifeHackWidgetView(entry: entry)
        }
        .supportedFamilies([.systemMedium, .systemLarge])
        .configurationDisplayName("今日の1枚")
        .description("今日の1枚を表示します")
    }
}

// MARK: - Preview

#Preview(as: .systemMedium) {
    widget()
} timeline: {
    LifeHackEntry(
        date: .now,
        phrase: "てすと 仕事",
        title: nil,
        widgetType: "lifeCard",
        imagePath: nil,
        updatedAt: 0
    )
}
